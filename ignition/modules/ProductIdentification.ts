import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ProductIdentificationModule = buildModule("ProductIdentificationModule", (m) => {
    // This ONLY deploys the contract. It does not try to add products.
    const productContract = m.contract("ProductIdentification");

    return { productContract };
});

export default ProductIdentificationModule;