// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Interface for zETHc (ConfidentialZETH)
interface IConfidentialZETH {
    function encryptedTransferFrom(address from, address to, externalEuint64 encryptedAmount, bytes calldata inputProof) external returns (euint64);
    function encryptedTransfer(address to, externalEuint64 encryptedAmount, bytes calldata inputProof) external returns (euint64);
    function transferFromWithEuint(address from, address to, euint64 amount) external returns (euint64);
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title IDOPool
/// @notice Confidential IDO pool with encrypted contributions and accounting
contract Pool is SepoliaConfig {
    address public owner;
    address public relayer;
    IConfidentialZETH public immutable zethc;
    // Reentrancy guard
    uint256 private _locked;

    string public projectName;
    IERC20 public saleToken;

    uint256 public priceNumerator;
    uint256 public priceDenominator;
    uint64 public saleStart;
    uint64 public saleEnd;

    uint64 public minPerAddress;
    uint64 public maxPerAddress;
    uint64 public hardCapPublic;
    bool public hardCapEncryptedMode;

    uint256 public raisedEthPublic;

    mapping(address => uint64) public minPerAddressOverride;
    mapping(address => uint64) public maxPerAddressOverride;

    euint64 private _hardCapE;
    euint64 private _raisedE;
    euint64 private _paidOutE;
    address public payoutTo;
    bool public payoutRequested;

    bool public finalized;
    uint256 public saleSupplyAtEnd;
    mapping(address => uint256) public claimedTokens;
    mapping(address => euint64) private _userMinCapE;
    mapping(address => euint64) private _userMaxCapE;
    mapping(address => euint64) private _userContribE;
    mapping(address => bool) private _hasContributed;

    euint64[] private _encryptedNote;

    event RelayerUpdated(address indexed relayer);
    event HardCapSet();
    event UserCapsSet(address indexed user);
    event PayoutAllRequested(address indexed to);
    event PayoutAllFulfilled(address indexed to);
    event Finalized(uint256 saleSupplyAtEnd);
    event Claimed(address indexed user, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ContributedEth(address indexed user, uint256 amountWei);
    event ContributedZethc(address indexed user);

    mapping(address => euint64[]) private _userNotes;

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "not relayer");
        _;
    }

    modifier nonReentrant() {
        require(_locked == 0, "reentrancy");
        _locked = 1;
        _;
        _locked = 0;
    }

    constructor(address zethcAddress, address initialRelayer) {
        require(zethcAddress != address(0), "bad zethc");
        owner = msg.sender;
        relayer = initialRelayer;
        zethc = IConfidentialZETH(zethcAddress);
        
        _raisedE = FHE.asEuint64(0);
        _hardCapE = FHE.asEuint64(0);
        _paidOutE = FHE.asEuint64(0);
        
        FHE.allowThis(_raisedE);
        FHE.allowThis(_hardCapE);
        FHE.allowThis(_paidOutE);
        
        emit RelayerUpdated(initialRelayer);
    }

    function setPublicMeta(string calldata name_, address saleToken_) external onlyOwner {
        projectName = name_;
        saleToken = IERC20(saleToken_);
    }

    function setSaleParams(
        uint256 _priceNumerator,
        uint256 _priceDenominator,
        uint64 _start,
        uint64 _end
    ) external onlyOwner {
        require(_priceNumerator > 0 && _priceDenominator > 0, "bad price");
        require(_start < _end, "bad time");
        priceNumerator = _priceNumerator;
        priceDenominator = _priceDenominator;
        saleStart = _start;
        saleEnd = _end;
    }

    function setCapsPublic(uint64 _minPerAddress, uint64 _maxPerAddress, uint64 _hardCapPublic) external onlyOwner {
        require(_maxPerAddress == 0 || _maxPerAddress >= _minPerAddress, "min>max");
        require(block.timestamp < saleStart || saleStart == 0, "started");
        minPerAddress = _minPerAddress;
        maxPerAddress = _maxPerAddress;
        hardCapPublic = _hardCapPublic;
        _hardCapE = FHE.asEuint64(_hardCapPublic);
        FHE.allowThis(_hardCapE);
        hardCapEncryptedMode = false;
    }

    function setUserCapsPublic(address user, uint64 minCap, uint64 maxCap) external onlyOwner {
        require(user != address(0), "bad user");
        require(maxCap == 0 || maxCap >= minCap, "min>max");
        require(block.timestamp < saleStart || saleStart == 0, "started");
        minPerAddressOverride[user] = minCap;
        maxPerAddressOverride[user] = maxCap;
    }

    function setRelayer(address newRelayer) external onlyOwner {
        require(newRelayer != address(0), "bad relayer");
        relayer = newRelayer;
        emit RelayerUpdated(newRelayer);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "bad owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function encryptedHardCap() external view returns (euint64) { 
        return _hardCapE; 
    }
    function encryptedRaised() external view returns (euint64) { 
        return _raisedE; 
    }
    function encryptedUserMin(address user) external view returns (euint64) { 
        require(user == msg.sender, "unauthorized: can only view own data");
        return _userMinCapE[user]; 
    }
    function encryptedUserMax(address user) external view returns (euint64) { 
        require(user == msg.sender, "unauthorized: can only view own data");
        return _userMaxCapE[user]; 
    }
    function encryptedUserContrib(address user) external view returns (euint64) { 
        require(user == msg.sender, "unauthorized: can only view own data");
        return _userContribE[user]; 
    }

    function setHardCap(externalEuint64 cap, bytes calldata proof) external onlyOwner {
        _hardCapE = FHE.fromExternal(cap, proof);
        FHE.allowThis(_hardCapE);
        emit HardCapSet();
        hardCapEncryptedMode = true;
        hardCapPublic = 0;
    }

    function setUserCaps(
        address user,
        externalEuint64 minCap,
        bytes calldata minProof,
        externalEuint64 maxCap,
        bytes calldata maxProof
    ) external onlyOwner {
        require(user != address(0), "bad user");
        require(block.timestamp < saleStart || saleStart == 0, "started");
        _userMinCapE[user] = FHE.fromExternal(minCap, minProof);
        _userMaxCapE[user] = FHE.fromExternal(maxCap, maxProof);
        FHE.allow(_userMinCapE[user], user);
        FHE.allow(_userMaxCapE[user], user);
        FHE.allowThis(_userMinCapE[user]);
        FHE.allowThis(_userMaxCapE[user]);
        emit UserCapsSet(user);
    }

    function setEncryptedNote(externalEuint64[] calldata parts, bytes[] calldata proofs) external onlyOwner {
        require(parts.length == proofs.length && parts.length > 0, "bad note");
        delete _encryptedNote;
        for (uint256 i = 0; i < parts.length; i++) {
            euint64 v = FHE.fromExternal(parts[i], proofs[i]);
            _encryptedNote.push(v);
            FHE.allowThis(_encryptedNote[i]);
        }
    }

    function encryptedNoteLength() external view returns (uint256) { return _encryptedNote.length; }

    function encryptedNotePart(uint256 i) external view returns (euint64) {
        require(i < _encryptedNote.length, "oob");
        return _encryptedNote[i];
    }

    function encryptedUserNoteLength(address user) external view returns (uint256) { return _userNotes[user].length; }
    function encryptedUserNotePart(address user, uint256 i) external view returns (euint64) {
        require(i < _userNotes[user].length, "oob");
        return _userNotes[user][i];
    }


    // Single-step participation: ETH or zETHc
    function contribute(
        externalEuint64 encryptedAmount,
        bytes calldata proof,
        externalEuint64[] calldata noteParts,
        bytes[] calldata noteProofs
    ) external payable nonReentrant returns (euint64 movedE) {
        require(block.timestamp >= saleStart && block.timestamp <= saleEnd, "not in time");
        require(noteParts.length == noteProofs.length, "bad note args");

        delete _userNotes[msg.sender];
        for (uint256 i = 0; i < noteParts.length; i++) {
            euint64 v = FHE.fromExternal(noteParts[i], noteProofs[i]);
            _userNotes[msg.sender].push(v);
            FHE.allowThis(_userNotes[msg.sender][i]);
            FHE.allow(_userNotes[msg.sender][i], msg.sender);
        }

        if (msg.value > 0) {
            require(msg.value <= type(uint64).max, "eth overflow");
            raisedEthPublic += msg.value;
            euint64 delta = FHE.asEuint64(uint64(msg.value));
            _userContribE[msg.sender] = FHE.add(_userContribE[msg.sender], delta);
            _raisedE = FHE.add(_raisedE, delta);
            _hasContributed[msg.sender] = true;
            FHE.allowThis(_userContribE[msg.sender]);
            FHE.allow(_userContribE[msg.sender], msg.sender);
            FHE.allowThis(_raisedE);
            FHE.allow(_raisedE, msg.sender);
            if (hardCapEncryptedMode) { FHE.allow(_hardCapE, msg.sender); }
            for (uint256 i = 0; i < _encryptedNote.length; i++) { FHE.allow(_encryptedNote[i], msg.sender); }
            for (uint256 i2 = 0; i2 < _userNotes[msg.sender].length; i2++) { FHE.allow(_userNotes[msg.sender][i2], msg.sender); }
            emit ContributedEth(msg.sender, msg.value);
            return delta;
        } else {
            euint64 amountE = FHE.fromExternal(encryptedAmount, proof);
            FHE.allowThis(amountE);
            FHE.allowTransient(amountE, address(zethc));
            euint64 moved = zethc.transferFromWithEuint(msg.sender, address(this), amountE);
            FHE.allowThis(moved);
            _userContribE[msg.sender] = FHE.add(_userContribE[msg.sender], moved);
            _raisedE = FHE.add(_raisedE, moved);
            _hasContributed[msg.sender] = true;
            FHE.allowThis(_userContribE[msg.sender]);
            FHE.allow(_userContribE[msg.sender], msg.sender);
            FHE.allowThis(_raisedE);
            FHE.allow(_raisedE, msg.sender);
            if (hardCapEncryptedMode) { FHE.allow(_hardCapE, msg.sender); }
            for (uint256 j = 0; j < _encryptedNote.length; j++) { FHE.allow(_encryptedNote[j], msg.sender); }
            for (uint256 j2 = 0; j2 < _userNotes[msg.sender].length; j2++) { FHE.allow(_userNotes[msg.sender][j2], msg.sender); }
            emit ContributedZethc(msg.sender);
            return moved;
        }
    }



    function finalizeSettlement() external onlyOwner {
        require(block.timestamp > saleEnd, "not ended");
        require(!finalized, "finalized");
        saleSupplyAtEnd = IERC20(saleToken).balanceOf(address(this));
        finalized = true;
        emit Finalized(saleSupplyAtEnd);
    }

    // Self-claim with relayer signature verification
    function claimWithAuth(uint64 contribPlain, uint64 raisedPlain, bytes calldata signature) external nonReentrant {
        require(finalized, "not finalized");
        require(raisedPlain > 0, "raised=0");
        require(address(saleToken) != address(0), "no saleToken");

        // Verify signature: signer must be the relayer; message binds pool contract, user, contrib, and raised to prevent reuse
        bytes32 msgHash = keccak256(abi.encodePacked("IDO_SETTLEMENT", address(this), msg.sender, contribPlain, raisedPlain));
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash));
        (bytes32 r, bytes32 s, uint8 v) = _splitSig(signature);
        address signer = ecrecover(ethHash, v, r, s);
        require(signer == relayer, "bad sig");

        // Calculate allocation: floor(S * contrib / R)
        uint256 alloc = (saleSupplyAtEnd * uint256(contribPlain)) / uint256(raisedPlain);
        uint256 already = claimedTokens[msg.sender];
        require(alloc > already, "nothing");
        uint256 toSend = alloc - already;
        claimedTokens[msg.sender] = alloc;

        bool ok = saleToken.transfer(msg.sender, toSend);
        require(ok, "claim failed");
        emit Claimed(msg.sender, toSend);
    }

    function _splitSig(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "siglen");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
    }

    // ===== Project injects sale tokens (public ERC20) into the pool escrow =====
    function depositSaleToken(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "zero");
        require(address(saleToken) != address(0), "no saleToken");
        bool ok = saleToken.transferFrom(msg.sender, address(this), amount);
        require(ok, "transferFrom failed");
    }

    // ===== Fulfill claim: relayer computes due tokens from confidential contributions and public price, then transfers ERC20 =====
    // Controlled claim: relayer submits plaintext amountToken (will be public in ERC20 events).
    function fulfillClaim(address user, uint256 amountToken) external onlyRelayer nonReentrant {
        require(block.timestamp > saleEnd, "not ended");
        require(user != address(0) && amountToken > 0, "bad claim");
        require(address(saleToken) != address(0), "no saleToken");
        bool ok = saleToken.transfer(user, amountToken);
        require(ok, "claim transfer failed");
    }

    // ===== After sale ends, project owner can withdraw unsold ERC20 =====
    function withdrawUnsold(address to, uint256 amount) external onlyOwner nonReentrant {
        require(block.timestamp > saleEnd, "not ended");
        require(to != address(0) && amount > 0, "bad withdraw");
        require(address(saleToken) != address(0), "no saleToken");
        bool ok = saleToken.transfer(to, amount);
        require(ok, "withdraw failed");
    }

    // ===== Authorize specific viewer to see aggregated raised amount (encrypted) =====
    function grantRaisedView(address viewer) external onlyOwner {
        require(viewer != address(0), "bad viewer");
        FHE.allow(_raisedE, viewer);
        if (hardCapEncryptedMode) {
            FHE.allow(_hardCapE, viewer);
        }
    }
    
    function refreshMyView() external {
        require(_hasContributed[msg.sender], "not contributor");
        FHE.allow(_raisedE, msg.sender);
        if (hardCapEncryptedMode) {
            FHE.allow(_hardCapE, msg.sender);
        }
    }

    // ===== Confidential internal payout: owner requests; relayer executes zETH confidential transfer from pool to project =====
    // Request payout of all: owner-only, callable once after sale ends; records recipient address
    function requestPayoutAll(address to) external onlyOwner {
        require(block.timestamp > saleEnd, "not ended");
        require(!payoutRequested, "already requested");
        require(to != address(0), "bad to");
        payoutTo = to;
        payoutRequested = true;
        emit PayoutAllRequested(to);
    }

    // Fulfill payout of all: relayer-only. Should submit an encrypted amount equal to remaining withdrawable; if larger, zETH contract rejects or transfers 0 per its rules.
    function fulfillPayoutAll(externalEuint64 encryptedAmount, bytes calldata proof) external onlyRelayer nonReentrant returns (euint64 moved) {
        require(payoutRequested && payoutTo != address(0), "not requested");
        euint64 movedE = zethc.encryptedTransfer(payoutTo, encryptedAmount, proof);
        _paidOutE = FHE.add(_paidOutE, movedE);
        FHE.allowThis(_paidOutE);
        FHE.allow(_paidOutE, payoutTo);
        if (relayer != address(0)) {
            FHE.allow(_paidOutE, relayer);
        }

        emit PayoutAllFulfilled(payoutTo);
        return movedE;
    }

    function encryptedPaidOut() external view returns (euint64) { return _paidOutE; }

    // ===== Additional grants: allow viewing encrypted hard cap / paid out =====
    function grantHardCapView(address viewer) external onlyOwner {
        require(viewer != address(0), "bad viewer");
        FHE.allow(_hardCapE, viewer);
    }

    function grantPaidOutView(address viewer) external onlyOwner {
        require(viewer != address(0), "bad viewer");
        FHE.allow(_paidOutE, viewer);
    }
}


