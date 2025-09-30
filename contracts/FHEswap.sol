// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

interface IConfidentialZETH {
    function mint(address to, uint64 amountWei) external;
    function burnFrom(address from, uint64 amountWei) external;
    function encryptedTransferFrom(address from, address to, externalEuint64 encryptedAmount, bytes calldata inputProof) external returns (euint64);
    function encryptedBalanceOf(address user) external view returns (euint64);
    function transferFromThis(address to, euint64 amount) external returns (euint64);
    function transferFromWithEuint(address from, address to, euint64 amount) external returns (euint64);
}

/// @title FHEswap
/// @notice Swap between ETH and confidential zETH
contract FHEswap is SepoliaConfig {
    address public owner;
    IConfidentialZETH public zethc;
    

    // Reentrancy guard
    uint256 private _locked;

    event Deposited(address indexed user);
    event SwapToEth(address indexed user, uint256 amount);
    event SwapFailed(address indexed user, uint256 requestId, string reason);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }



    modifier nonReentrant() {
        require(_locked == 0, "reentrancy");
        _locked = 1;
        _;
        _locked = 0;
    }

    constructor() {
        owner = msg.sender;
    }

    function setZethc(address token) external {
        require(msg.sender == owner, "not owner");
        require(token != address(0), "bad token");
        zethc = IConfidentialZETH(token);
    }

    function encryptedBalanceOf(address user) external view returns (euint64) {
        return zethc.encryptedBalanceOf(user);
    }



    function deposit() external payable nonReentrant {
        require(address(zethc) != address(0), "no token");
        require(msg.value > 0 && msg.value <= type(uint64).max, "bad eth");
        zethc.mint(msg.sender, uint64(msg.value));
        emit Deposited(msg.sender);
    }

    mapping(uint256 => euint64) private _requestedSwap;
    mapping(uint256 => address) private _swapRequester;
    event SwapRequested(address indexed user);
    event SwapDecryptRequested(address indexed user, uint256 requestId);

    function swapToEth(externalEuint64 encryptedAmount, bytes calldata inputProof) external payable nonReentrant {
        require(address(zethc) != address(0), "no token");
        require(msg.value == 0, "do not send eth");

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allow(amount, address(zethc));
        euint64 moved = zethc.transferFromWithEuint(msg.sender, address(this), amount);
        
        FHE.allowThis(moved);
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(moved);
        uint256 requestId = FHE.requestDecryption(cts, this.fulfillSwap.selector);

        _requestedSwap[requestId] = moved;
        _swapRequester[requestId] = msg.sender;
        _requestTimestamp[requestId] = block.timestamp;
        FHE.allowThis(_requestedSwap[requestId]);
        
        emit SwapRequested(msg.sender);
        emit SwapDecryptRequested(msg.sender, requestId);
    }

    // Simplified callback
    function fulfillSwapSimple(uint256 requestId, uint64 contractBalanceWei, bytes[] calldata signatures) external nonReentrant {
        // Verify signatures first (Zama callback requirement)
        FHE.checkSignatures(requestId, signatures);
        address user = _swapRequester[requestId];
        require(user != address(0), "unknown requestId");
        
        if (contractBalanceWei == 0) {
            _recoverUserFunds(user, requestId);
            _requestedSwap[requestId] = FHE.asEuint64(0);
            FHE.allowThis(_requestedSwap[requestId]);
            delete _swapRequester[requestId];
            delete _requestTimestamp[requestId];
            emit SwapFailed(user, requestId, "no balance");
            return;
        }
        
        if (address(this).balance < contractBalanceWei) {
            _recoverUserFunds(user, requestId);
            _requestedSwap[requestId] = FHE.asEuint64(0);
            FHE.allowThis(_requestedSwap[requestId]);
            delete _swapRequester[requestId];
            delete _requestTimestamp[requestId];
            emit SwapFailed(user, requestId, "insufficient contract eth");
            return;
        }
        
        (bool ok, ) = user.call{ value: contractBalanceWei }("");
        if (!ok) {
            _recoverUserFunds(user, requestId);
            _requestedSwap[requestId] = FHE.asEuint64(0);
            FHE.allowThis(_requestedSwap[requestId]);
            delete _swapRequester[requestId];
            delete _requestTimestamp[requestId];
            emit SwapFailed(user, requestId, "eth transfer failed");
            return;
        }

        // Burn zETHc from this contract
        zethc.burnFrom(address(this), contractBalanceWei);
        
        // Clean up stored ciphertext and emit event
        _requestedSwap[requestId] = FHE.asEuint64(0);
        FHE.allowThis(_requestedSwap[requestId]);
        emit SwapToEth(user, contractBalanceWei);
        delete _swapRequester[requestId];
        delete _requestTimestamp[requestId];
    }

    // Gateway callback (typed params): receives decrypted amount and gateway signatures
    // Per latest docs: after signature verification, use amountWei to fulfill payout
    function fulfillSwap(uint256 requestId, uint64 amountWei, bytes[] calldata signatures) external nonReentrant {
        // Verify signatures first; avoid any state read/write before verification
        FHE.checkSignatures(requestId, signatures);
        // Use the user recorded for the request; do not rely on tx.origin
        address user = _swapRequester[requestId];
        require(user != address(0), "unknown requestId");
        
        if (amountWei == 0) {
            // Zero amount, recover user funds
            _recoverUserFunds(user, requestId);
            delete _swapRequester[requestId];
            delete _requestTimestamp[requestId];
            emit SwapFailed(user, requestId, "zero amount");
            return;
        }
        if (address(this).balance < amountWei) {
            _recoverUserFunds(user, requestId);
            delete _swapRequester[requestId];
            delete _requestTimestamp[requestId];
            emit SwapFailed(user, requestId, "insufficient contract eth");
            return;
        }
        
        (bool ok, ) = user.call{ value: amountWei }("");
        if (!ok) {
            _recoverUserFunds(user, requestId);
            delete _swapRequester[requestId];
            delete _requestTimestamp[requestId];
            emit SwapFailed(user, requestId, "eth transfer failed");
            return;
        }

        // Success: burn equal amount of zETHc (from contract balance)
        zethc.burnFrom(address(this), amountWei);
        // Clean up persisted ciphertext for this request
        _requestedSwap[requestId] = FHE.asEuint64(0);
        FHE.allowThis(_requestedSwap[requestId]);
        
        emit SwapToEth(user, amountWei);
        _cleanupRequest(requestId);
    }

    // Removed fulfillWithdraw; single-step design

    // Receive native ETH
    receive() external payable {}

    // Internal: recover user funds (return zETHc stored in the contract to the user)
    function _recoverUserFunds(address user, uint256 requestId) private {
        euint64 amt = _requestedSwap[requestId];
        // Allow zETHc to read and process the ciphertext amount
        if (address(zethc) != address(0)) {
            FHE.allow(amt, address(zethc));
            zethc.transferFromThis(user, amt);
        }
        _requestedSwap[requestId] = FHE.asEuint64(0);
        FHE.allowThis(_requestedSwap[requestId]);
    }

    function _cleanupRequest(uint256 requestId) private { delete _swapRequester[requestId]; delete _requestTimestamp[requestId]; }
    
    // Emergency recovery: if decryption request fails for over 24h, user can recover funds
    mapping(uint256 => uint256) private _requestTimestamp;
    
    function emergencyRecoverFunds(uint256 requestId) external nonReentrant {
        address user = _swapRequester[requestId];
        require(user == msg.sender, "not your request");
        require(block.timestamp > _requestTimestamp[requestId] + 24 hours, "too early");
        
        // Recover user funds
        _recoverUserFunds(user, requestId);
        delete _swapRequester[requestId];
        delete _requestTimestamp[requestId];
        emit SwapFailed(user, requestId, "emergency recovery");
    }
}


