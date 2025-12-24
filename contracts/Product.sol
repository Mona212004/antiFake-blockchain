 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ProductIdentification
 * @dev Merged contract for high-performance product traceability with dual-signature support.
 */
contract ProductIdentification {
    
    // --- 1. STATE VARIABLES & OPTIMIZED PACKING ---
    address public owner;
    uint256 public productCount;

    struct Product {
        uint256 id;
        string serialNumber;      // [System Model Requirement]
        string name;
        string brand;             // [System Model Requirement]
        string description;
        string manufactDate;      // Timestamp at original company
        string imageUrl;          // [System Model Requirement]
        address currentOwner;     // 20 bytes
        bool isSold;              // 1 byte - Packed with address to save 20k gas
        address[] history;        // Traceability Chain
        string[] locationHistory; // Provenance locations [System Model Requirement]
        string[] actorNames;      // Names for history actors
        string[] timestampHistory; // Timestamps for history entries
        string manufacturerName;
        string manufacturerSig;   // Company unique signature
        address[] allowedRetailers; 
        string retailerSig;       // Retailer unique signature (single for simplicity; could be array for multiple)
    }

    // --- 2. O(1) MAPPING LOGIC ---
    mapping(uint256 => Product) public products;

    // --- 3. EVENTS (Frontend Listening) ---
    event ProductCreated(uint256 indexed id, string name, address indexed manufacturer);
    event ProductTransferred(uint256 indexed id, address indexed from, address indexed to);
    event ProductReceivedByRetailer(uint256 indexed id, address indexed retailer, string location);

    // --- 4. CUSTOM GAS-SAVING ERRORS ---
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

    // --- 5. ENHANCED LOGIC ---

    /**
     * @dev Manufacturer adds product with full metadata and genesis signature.
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
        address[] memory _allowedRetailers
    ) public {
        productCount++;
        Product storage newProduct = products[productCount];
        newProduct.id = productCount;
        newProduct.serialNumber = _serial;
        newProduct.name = _name;
        newProduct.brand = _brand;
        newProduct.description = _description;
        newProduct.imageUrl = _image;
        newProduct.manufactDate = _date;
        newProduct.currentOwner = msg.sender;
        newProduct.isSold = false;
        newProduct.manufacturerSig = _mfgSig;
        newProduct.manufacturerName = _manufacturerName;
        newProduct.allowedRetailers = _allowedRetailers;

        newProduct.history.push(msg.sender);
        newProduct.locationHistory.push(_mfgLocation);
        newProduct.actorNames.push(_manufacturerName);
        newProduct.timestampHistory.push(_date);

        emit ProductCreated(productCount, _name, msg.sender);
    }

    /**
     * @dev Retailer scans QR and updates location/signature. 
     * Status remains isSold = false per System Model.
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
     * @dev Final sale to consumer. Sets isSold to true.
     */
    function sellToConsumer(uint256 _productId) public {
        Product storage p = products[_productId];
        if (p.currentOwner != msg.sender) revert Unauthorized();
        
        p.isSold = true;
    }

    /**
     * @dev Returns full provenance: address chain, location chain, actor names, timestamps.
     */
    function getProductHistory(uint256 _productId) 
        public 
        view 
        returns (address[] memory, string[] memory, string[] memory, string[] memory) 
    {
        Product storage p = products[_productId];
        return (p.history, p.locationHistory, p.actorNames, p.timestampHistory);
    }
}