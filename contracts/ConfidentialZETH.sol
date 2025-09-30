// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialZETH
/// @notice Confidential ERC-20 with encrypted balances/allowances
contract ConfidentialZETH is SepoliaConfig {
    string public name;
    string public symbol;
    uint8 public immutable decimals = 18;
    uint64 public totalSupply;

    address public owner;
    address public minter;

    mapping(address => euint64) private _balances;
    mapping(address => mapping(address => euint64)) private _allowances;

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    modifier onlyMinter() { require(msg.sender == minter, "not minter"); _; }

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event MinterUpdated(address indexed minter);
    // Events without amounts to avoid leaking values
    event Transfer(address indexed from, address indexed to);
    event Approval(address indexed owner, address indexed spender);
    event Minted(address indexed to, uint64 amountWei);
    event Burned(address indexed from, uint64 amountWei);

    constructor(string memory _name, string memory _symbol) {
        owner = msg.sender;
        name = _name;
        symbol = _symbol;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "bad owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "bad minter");
        minter = newMinter;
        emit MinterUpdated(newMinter);
    }

    // Plaintext mint/burn for bridge
    function mint(address to, uint64 amountWei) external onlyMinter {
        require(to != address(0) && amountWei > 0, "bad mint");
        require(totalSupply <= type(uint64).max - amountWei, "supply overflow");
        euint64 delta = FHE.asEuint64(amountWei);
        _balances[to] = FHE.add(_balances[to], delta);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);
        totalSupply += amountWei;
        emit Minted(to, amountWei);
        emit Transfer(address(0), to);
    }

    function burnFrom(address from, uint64 amountWei) external onlyMinter {
        require(from != address(0) && amountWei > 0, "bad burn");
        require(totalSupply >= amountWei, "supply underflow");
        euint64 amt = FHE.asEuint64(amountWei);
        euint64 bal = _balances[from];
        euint64 can = FHE.select(FHE.le(amt, bal), amt, FHE.asEuint64(0));
        _balances[from] = FHE.sub(bal, can);
        FHE.allowThis(_balances[from]);
        FHE.allow(_balances[from], from);
        totalSupply -= amountWei;
        emit Burned(from, amountWei);
        emit Transfer(from, address(0));
    }

    function encryptedBalanceOf(address user) external view returns (euint64) {
        require(msg.sender == user, "unauthorized");
        return _balances[user];
    }

    function balanceOf(address user) external view returns (euint64) {
        require(msg.sender == user, "unauthorized");
        return _balances[user];
    }

    function encryptedAllowance(address owner_, address spender) external view returns (euint64) {
        require(msg.sender == owner_ || msg.sender == spender, "unauthorized");
        return _allowances[owner_][spender];
    }

    function encryptedApprove(address spender, externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        returns (euint64)
    {
        require(spender != address(0), "bad spender");
        euint64 amt = FHE.fromExternal(encryptedAmount, inputProof);
        _allowances[msg.sender][spender] = amt;
        FHE.allowThis(_allowances[msg.sender][spender]);
        FHE.allow(_allowances[msg.sender][spender], msg.sender);
        FHE.allow(_allowances[msg.sender][spender], spender);
        emit Approval(msg.sender, spender);
        return amt;
    }

    function approve(address spender, externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        returns (euint64)
    {
        require(spender != address(0), "bad spender");
        euint64 amt = FHE.fromExternal(encryptedAmount, inputProof);
        _allowances[msg.sender][spender] = amt;
        FHE.allowThis(_allowances[msg.sender][spender]);
        FHE.allow(_allowances[msg.sender][spender], msg.sender);
        FHE.allow(_allowances[msg.sender][spender], spender);
        emit Approval(msg.sender, spender);
        return amt;
    }

    function encryptedTransfer(address to, externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        returns (euint64)
    {
        require(to != address(0), "bad to");
        euint64 req = FHE.fromExternal(encryptedAmount, inputProof);
        euint64 step = FHE.select(FHE.le(req, _balances[msg.sender]), req, FHE.asEuint64(0));
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], step);
        _balances[to] = FHE.add(_balances[to], step);

        FHE.allowThis(_balances[msg.sender]);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allow(_balances[to], to);
        FHE.allow(step, msg.sender);
        emit Transfer(msg.sender, to);
        return step;
    }

    function transfer(address to, externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        returns (euint64)
    {
        require(to != address(0), "bad to");
        euint64 req = FHE.fromExternal(encryptedAmount, inputProof);
        euint64 step = FHE.select(FHE.le(req, _balances[msg.sender]), req, FHE.asEuint64(0));
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], step);
        _balances[to] = FHE.add(_balances[to], step);

        FHE.allowThis(_balances[msg.sender]);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allow(_balances[to], to);
        FHE.allow(step, msg.sender);
        emit Transfer(msg.sender, to);
        return step;
    }

    function encryptedTransferFrom(address from, address to, externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        returns (euint64)
    {
        require(from != address(0) && to != address(0), "bad addr");
        euint64 req = FHE.fromExternal(encryptedAmount, inputProof);
        euint64 allowed = _allowances[from][msg.sender];
        euint64 step1 = FHE.select(FHE.le(req, allowed), req, FHE.asEuint64(0));
        euint64 step2 = FHE.select(FHE.le(step1, _balances[from]), step1, FHE.asEuint64(0));

        _allowances[from][msg.sender] = FHE.sub(allowed, step2);
        _balances[from] = FHE.sub(_balances[from], step2);
        _balances[to] = FHE.add(_balances[to], step2);

        FHE.allowThis(_allowances[from][msg.sender]);
        FHE.allowThis(_balances[from]);
        FHE.allowThis(_balances[to]);
        FHE.allow(_allowances[from][msg.sender], from);
        FHE.allow(_allowances[from][msg.sender], msg.sender);
        FHE.allow(_balances[from], from);
        FHE.allow(_balances[to], to);
        FHE.allow(step2, msg.sender);
        emit Transfer(from, to);
        return step2;
    }

    function transferFrom(address from, address to, externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        returns (euint64)
    {
        require(from != address(0) && to != address(0), "bad addr");
        euint64 req = FHE.fromExternal(encryptedAmount, inputProof);
        euint64 allowed = _allowances[from][msg.sender];
        euint64 step1 = FHE.select(FHE.le(req, allowed), req, FHE.asEuint64(0));
        euint64 step2 = FHE.select(FHE.le(step1, _balances[from]), step1, FHE.asEuint64(0));

        _allowances[from][msg.sender] = FHE.sub(allowed, step2);
        _balances[from] = FHE.sub(_balances[from], step2);
        _balances[to] = FHE.add(_balances[to], step2);

        FHE.allowThis(_allowances[from][msg.sender]);
        FHE.allowThis(_balances[from]);
        FHE.allowThis(_balances[to]);
        FHE.allow(_allowances[from][msg.sender], from);
        FHE.allow(_allowances[from][msg.sender], msg.sender);
        FHE.allow(_balances[from], from);
        FHE.allow(_balances[to], to);
        FHE.allow(step2, msg.sender);
        emit Transfer(from, to);
        return step2;
    }

    function transferFromWithEuint(address from, address to, euint64 amount) external returns (euint64) {
        require(from != address(0) && to != address(0), "bad addr");
        FHE.allowThis(amount);
        euint64 allowed = _allowances[from][msg.sender];
        euint64 step1 = FHE.select(FHE.le(amount, allowed), amount, FHE.asEuint64(0));
        euint64 step2 = FHE.select(FHE.le(step1, _balances[from]), step1, FHE.asEuint64(0));

        _allowances[from][msg.sender] = FHE.sub(allowed, step2);
        _balances[from] = FHE.sub(_balances[from], step2);
        _balances[to] = FHE.add(_balances[to], step2);

        FHE.allowThis(_allowances[from][msg.sender]);
        FHE.allowThis(_balances[from]);
        FHE.allowThis(_balances[to]);
        FHE.allow(_allowances[from][msg.sender], from);
        FHE.allow(_allowances[from][msg.sender], msg.sender);
        FHE.allow(_balances[from], from);
        FHE.allow(_balances[to], to);
        FHE.allowThis(step2);
        FHE.allow(step2, msg.sender);
        FHE.allow(step2, from);
        FHE.allow(step2, to);
        emit Transfer(from, to);
        return step2;
    }

    function transferFromThis(address to, euint64 amount) external returns (euint64) {
        require(msg.sender == minter, "not minter");
        require(to != address(0), "bad to");
        _balances[address(this)] = FHE.sub(_balances[address(this)], amount);
        _balances[to] = FHE.add(_balances[to], amount);
        FHE.allowThis(_balances[address(this)]);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);
        return amount;
    }
}


