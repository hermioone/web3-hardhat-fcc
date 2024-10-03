const { run } = require('hardhat');

const verify = async (contractAddr, args) => {
    console.log('Verifying contract.');
    try {
        await run('verify:verify', {
            address: contractAddr,
            constructorArguments: args,
        });
    } catch (e) {
        if (e.message.toLowerCase().includes('already verified')) {
            console.log('Already verified...');
        } else {
            console.log(e);
        }
    }
};

module.exports = {
    verify,
};
