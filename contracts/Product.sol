// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ProductIdentification
 * @dev High-performance product traceability contract with dual-signature support and on-chain intended retailer.
 */
contract ProductIdentification {

    // --- 1. STATE VARIABLES ---
    address public owner;
    uint256 public productCount;

    struct Product {
        uint256 id;
        string serialNumber;
        string name;
        string brand;
        string description;
        string manufactDate;
        string imageUrl;
        address currentOwner;
        bool isSold;
        address[] history;
        string[] locationHistory;
        string[] actorNames;
        string[] timestampHistory;
        string manufacturerName;
        string manufacturerSig;
        address[] allowedRetailers;
        string intendedRetailer;    // Retailer name set at registration (on-chain)
        string retailerSig;
    }

    mapping(uint256 => Product) public products;

    // --- 2. EVENTS ---
    event ProductCreated(
        uint256 indexed id,
        string name,
        address indexed manufacturer,
        string intendedRetailer
    );
    event ProductTransferred(uint256 indexed id, address indexed from, address indexed to);
    event ProductReceivedByRetailer(uint256 indexed id, address indexed retailer, string location);

    // --- 3. ERRORS ---
    error Unauthorized();
    error ProductNotFound();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    function contains(address[] memory array, address value) internal pure returns (bool) {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == value) return true;
        }
        return false;
    }

    /**
     * @dev Manufacturer adds a product with intended retailer name stored on-chain
     */
    function addProduct(
        string memory _serial,
        string memory _name,
        string memory _brand,
        string memory _description,
        string memory _image,
        string memory _date,
        string memory _mfgLocation,
        string memory _mfgSig,
        string memory _manufacturerName,
        address[] memory _allowedRetailers,
        string memory _intendedRetailerName  // Retailer shop name from frontend
    ) public {
        productCount++;
        Product storage p = products[productCount];

        p.id = productCount;
        p.serialNumber = _serial;
        p.name = _name;
        p.brand = _brand;
        p.description = _description;
        p.imageUrl = _image;
        p.manufactDate = _date;
        p.currentOwner = msg.sender;
        p.isSold = false;
        p.manufacturerSig = _mfgSig;
        p.manufacturerName = _manufacturerName;
        p.allowedRetailers = _allowedRetailers;
        p.intendedRetailer = _intendedRetailerName;  // Stored on-chain

        // Initialize history
        p.history.push(msg.sender);
        p.locationHistory.push(_mfgLocation);
        p.actorNames.push(_manufacturerName);
        p.timestampHistory.push(_date);

        emit ProductCreated(productCount, _name, msg.sender, _intendedRetailerName);
    }

    /**
     * @dev Retailer receives product and adds their signature
     */
    function retailerReceive(
        uint256 _productId,
        string memory _retailerLocation,
        string memory _retSig,
        string memory _retailerName,
        string memory _retailerTimestamp
    ) public {
        Product storage p = products[_productId];
        if (p.id == 0) revert ProductNotFound();
        if (!contains(p.allowedRetailers, msg.sender)) revert Unauthorized();

        address oldOwner = p.currentOwner;
        p.currentOwner = msg.sender;
        p.retailerSig = _retSig;
        p.isSold = false;

        p.history.push(msg.sender);
        p.locationHistory.push(_retailerLocation);
        p.actorNames.push(_retailerName);
        p.timestampHistory.push(_retailerTimestamp);

        emit ProductTransferred(_productId, oldOwner, msg.sender);
        emit ProductReceivedByRetailer(_productId, msg.sender, _retailerLocation);
    }

    /**
     * @dev Final sale to consumer
     */
    function sellToConsumer(uint256 _productId) public {
        Product storage p = products[_productId];
        if (p.currentOwner != msg.sender) revert Unauthorized();
        p.isSold = true;
    }

    /**
     * @dev Returns full provenance history
     */
    function getProductHistory(uint256 _productId)
        public
        view
        returns (
            address[] memory,
            string[] memory,
            string[] memory,
            string[] memory
        )
    {
        Product storage p = products[_productId];
        return (
            p.history,
            p.locationHistory,
            p.actorNames,
            p.timestampHistory
        );
    }
}