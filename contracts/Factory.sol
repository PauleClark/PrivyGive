// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import "./IDOPool.sol";

/// @title LaunchpadFactory
/// @notice Create confidential IDO pools
contract Factory is SepoliaConfig {
    address public immutable defaultZeth;
    address public immutable defaultRelayer;

    constructor(address _zeth, address _relayer) {
        require(_zeth != address(0) && _relayer != address(0), "bad defaults");
        defaultZeth = _zeth;
        defaultRelayer = _relayer;
    }
    event PoolCreated(
        address indexed creator,
        address pool,
        address zeth,
        string  projectName,
        address saleToken
    );

    address[] public allPools;
    mapping(address => address[]) public creatorPools;

    function createPoolWithDefaults(
        string calldata projectName
    ) external returns (address pool) {
        IDOPool p = new IDOPool(defaultZeth, defaultRelayer);
        p.setPublicMeta(projectName, address(0));
        pool = address(p);
        allPools.push(pool);
        creatorPools[msg.sender].push(pool);
        emit PoolCreated(msg.sender, pool, defaultZeth, projectName, address(0));
    }

    function createAndInitPool(
        string calldata projectName,
        uint256 priceNumerator,
        uint256 priceDenominator,
        uint64 saleStart,
        uint64 saleEnd,
        uint64 minPerAddress,
        uint64 maxPerAddress,
        uint64 hardCapPublic,
        bool startNow
    ) external returns (address pool) {
        IDOPool p = new IDOPool(defaultZeth, defaultRelayer);
        p.setPublicMeta(projectName, address(0));
        // To allow immediate start, set caps while saleStart is still 0
        p.setCapsPublic(minPerAddress, maxPerAddress, hardCapPublic);
        uint64 startTs = startNow ? uint64(block.timestamp) : saleStart;
        p.setSaleParams(priceNumerator, priceDenominator, startTs, saleEnd);
        pool = address(p);
        allPools.push(pool);
        creatorPools[msg.sender].push(pool);
        emit PoolCreated(msg.sender, pool, defaultZeth, projectName, address(0));
    }

    event PoolOwnershipClaimed(address indexed creator, address indexed pool);

    function claimPoolOwnership(address pool) external {
        require(pool != address(0), "bad pool");
        bool found = false;
        address[] storage list = creatorPools[msg.sender];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == pool) { found = true; break; }
        }
        require(found, "not creator");

        require(IDOPool(pool).finalized(), "not finalized");
        require(IDOPool(pool).owner() == address(this), "already transferred");

        IDOPool(pool).transferOwnership(msg.sender);
        emit PoolOwnershipClaimed(msg.sender, pool);
    }

    function allPoolsLength() external view returns (uint256) { return allPools.length; }
    function poolsOf(address creator) external view returns (address[] memory) { return creatorPools[creator]; }
}


