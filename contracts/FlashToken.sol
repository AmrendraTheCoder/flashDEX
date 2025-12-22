// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FlashToken - ERC20 Token with Permit for FlashDEX
 * @notice ERC20 token with gasless approvals (EIP-2612) for testnet trading
 * @dev Optimized for gas efficiency with immutable decimals
 * 
 * SECURITY FEATURES:
 * - OpenZeppelin's battle-tested ERC20 implementation
 * - EIP-2612 Permit for gasless approvals
 * - Ownable with restricted minting
 * - Faucet integration for controlled token distribution
 * 
 * GAS OPTIMIZATIONS:
 * - Immutable decimals (saves SLOAD on every decimals() call)
 * - Minimal storage footprint
 * - Uses OpenZeppelin's optimized implementations
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FlashToken is ERC20, ERC20Permit, Ownable {
    // ============ IMMUTABLE STORAGE (Gas Optimized) ============
    uint8 private immutable _tokenDecimals;
    
    // ============ MUTABLE STORAGE ============
    address public faucet;
    
    // ============ EVENTS ============
    event FaucetUpdated(address indexed oldFaucet, address indexed newFaucet);
    
    // ============ ERRORS ============
    error Unauthorized();
    error ZeroAddress();
    
    /**
     * @notice Deploy a new FlashToken
     * @param name Token name (e.g., "Flash ETH")
     * @param symbol Token symbol (e.g., "FETH")
     * @param decimalsValue Token decimals (18 for FETH, 6 for FUSDT)
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimalsValue
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(msg.sender) {
        _tokenDecimals = decimalsValue;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Returns token decimals
     * @dev Uses immutable storage for gas efficiency
     */
    function decimals() public view override returns (uint8) {
        return _tokenDecimals;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Set the authorized faucet address
     * @param _faucet Address of the faucet contract
     */
    function setFaucet(address _faucet) external onlyOwner {
        if (_faucet == address(0)) revert ZeroAddress();
        emit FaucetUpdated(faucet, _faucet);
        faucet = _faucet;
    }
    
    /**
     * @notice Mint tokens to an address
     * @dev Only callable by faucet or owner
     * @param to Recipient address
     * @param amount Amount to mint (in token units with decimals)
     */
    function mint(address to, uint256 amount) external {
        if (msg.sender != faucet && msg.sender != owner()) revert Unauthorized();
        if (to == address(0)) revert ZeroAddress();
        _mint(to, amount);
    }
    
    /**
     * @notice Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
