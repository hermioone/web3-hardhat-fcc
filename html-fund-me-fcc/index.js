import { ethers } from "./ethers-5.6.esm.min.js";
import { abi, contractAddress } from "./constants.js";


const connectButton = document.getElementById("connectButton");
const fundButton = document.getElementById("fundButton");
const balanceButton = document.getElementById("balanceButton");
const withdrawButton = document.getElementById("withdrawButton");
connectButton.onclick = connect;
fundButton.onclick = fund;
balanceButton.onclick = getBalance;
withdrawButton.onclick = withdraw;

console.log(ethers);

async function connect() {
	if (typeof window.ethereum != "undefined") {
		console.log("metamask exists.");
		await window.ethereum.request({ method: "eth_requestAccounts" });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, abi, signer);
		document.getElementById("connectButton").innerHTML = "Conected!";
	}
}

function listenForTransactionMin(transactionResponse, provider) {
    console.log(`Mining ${transactionResponse.hash}...`);
    // listen for this transaction to finish
    return new Promise((resolve, reject) => {
        provider.once(transactionResponse.hash, (transactionReceipt) => {
            console.log(`Completed with ${transactionReceipt.confirmations} confirmations.`);
            resolve();
        });
    });
}

async function fund() {
    const ethAmount = "10";
	console.log(`Funding with ${ethAmount}`);
	if (typeof window.ethereum != "undefined") {
        // 从 metamask 中找到 HTTP 端点，封装成 provider
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        console.log(`Signer is ${await signer.getAddress()}`);
        const contract = new ethers.Contract(contractAddress, abi, signer);
        try {
            const transactionResponse = await contract.fund({value: ethers.utils.parseEther(ethAmount)});
            // 监听这个交易被打包
            // const transactionReceipt = await transactionResponse.wait(1); 也可以使用这个
            await listenForTransactionMin(transactionResponse, provider);
            console.log("Done...");
        } catch (error) {
            console.error(error);
        }
        
	}
}

async function getBalance() {
    if (typeof window.ethereum != "undefined") {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const balance = await provider.getBalance(contractAddress);
        console.log(`合约中的余额为：${ethers.utils.formatEther(balance)}`);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, abi, signer);
        const owner = await contract.getOwner();
        console.log(`Owner 是：${owner}`)
    }
}

async function withdraw() {
    if (typeof window.ethereum != "undefined") {
        // 从 metamask 中找到 HTTP 端点，封装成 provider
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, abi, signer);
        try {
            const transactionResponse = await contract.withdraw();
            // 监听这个交易被打包
            // const transactionReceipt = await transactionResponse.wait(1); 也可以使用这个
            await listenForTransactionMin(transactionResponse, provider);
            console.log("Done...");
        } catch (error) {
            console.error(error);
        }
        
	}
}
