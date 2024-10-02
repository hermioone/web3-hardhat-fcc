const { ethers } = require("hardhat");
const { assert } = require("chai");

describe("SimpleStorage", async () => {
	let simpleStorageFactory, simpleStorage;
	beforeEach(async () => {
		simpleStorageFactory = await ethers.getContractFactory("SimpleStorage");
		simpleStorage = await simpleStorageFactory.deploy();
	});

	it("Should start with a favorite number of 0.", async function () {
		let currentValue = await simpleStorage.retrive();
		assert.equal(currentValue, "0");
	});
    it("Should update when we call store", async () => {
        const transactionResponse = await simpleStorage.store("8");
        await transactionResponse.wait(1);
        let currentValue = await simpleStorage.retrive();
        assert.equal(currentValue, "8");
    })
});
