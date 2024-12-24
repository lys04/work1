import './App.css'

import { ethers } from 'ethers'
import React, { useCallback, useEffect, useState } from 'react'

// 导入 ABI
import MarketABI from './abis/Market.json'
import MyNFTABI from './abis/MyNFT.json'

//  合约地址
const MYNFT_ADDRESS = "0xf9032BF4B4Bc3982A9b59e0078AfB6a6434C6809";
const MARKET_ADDRESS = "0x224018b77021CDAE1D7424b2d8610F6Aa658aC4f";

function App() {
  const [account, setAccount] = useState(null);
  // const [provider, setProvider] = useState(null);
  const [nftContract, setNftContract] = useState(null);
  const [marketContract, setMarketContract] = useState(null);
  const [tokenId, setTokenId] = useState('');
  const [tokenCID, setTokenCID] = useState('');
  const [price, setPrice] = useState('');
  const [nftsForSale, setNftsForSale] = useState([]);
  const [userNFTs, setUserNFTs] = useState([]);
  const [loading, setLoading] = useState(false);

  // 连接到 MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const newProvider = new ethers.providers.Web3Provider(window.ethereum);
      const newSigner = newProvider.getSigner();
      const newAccount = await newSigner.getAddress();
      setAccount(newAccount);
      // setProvider(newProvider);

      const nftContractInstance = new ethers.Contract(MYNFT_ADDRESS, MyNFTABI.abi, newSigner);
      setNftContract(nftContractInstance);

      const marketContractInstance = new ethers.Contract(MARKET_ADDRESS, MarketABI.abi, newSigner);
      setMarketContract(marketContractInstance);
    } else {
      alert('Please install MetaMask!');
    }
  };

  // 铸造 NFT
  const mintNFT = async () => {
    if (!nftContract || !tokenCID) return;

    setLoading(true);
    try {
      const transaction = await nftContract.safeMint(account, tokenCID);
      await transaction.wait();
      alert('NFT Minted Successfully!');
    } catch (err) {
      console.error(err);
      alert('Error minting NFT');
    } finally {
      setLoading(false);
    }
  };

  // 列出 NFT 出售
  const listNFTForSale = async () => {
    if (!marketContract || !tokenId || !price) return;

    setLoading(true);
    try {
      const transaction = await marketContract.listNFTForSale(tokenId, ethers.utils.parseEther(price));
      await transaction.wait();
      alert('NFT listed for sale!');
    } catch (err) {
      console.error(err);
      alert('Error listing NFT for sale');
    } finally {
      setLoading(false);
    }
  }


  const delistNFT = async (id) => {
    if (!marketContract) return;

    setLoading(true);
    try {
      const transaction = await marketContract.delistNFT(id);
      await transaction.wait();
      alert('NFT delisted from sale');
    } catch (err) {
      console.error(err);
      alert('Error delisting NFT');
    } finally {
      setLoading(false);
    }
  };

  // 购买 NFT
  const buyNFT = async (tokenId, price) => {
    if (!account || !marketContract || !nftContract) return;
  
    try {
      setLoading(true);
  
      const priceInWei = ethers.utils.parseEther(price); // 将 ETH 转为 Wei（以太坊最小单位）
  
      // 调用合约购买 NFT
      const tx = await marketContract.buyNFT(tokenId, { value: priceInWei });
  
      // 等待交易完成
      await tx.wait();
      
      alert('NFT purchased successfully!');
      fetchNftsForSale(); 
    } catch (err) {
      console.error(err);
      alert('Error buying NFT');
    } finally {
      setLoading(false);
    }
  }; 

  const fetchNftsForSale = useCallback(async () => {
    if (!marketContract || !nftContract) return;
  
    try {
      const totalSupply = await nftContract.totalSupply();
      const nfts = [];
      for (let i = 0; i < totalSupply.toNumber(); i++) { 
        const tokenId = await nftContract.tokenByIndex(i);
        const priceBigNumber = await marketContract.getPrice(tokenId);
       const price = ethers.utils.formatEther(priceBigNumber).toString(); 
        console.log('price formatted as ETH:', price);
  
        const isForSale = await marketContract.isForSale(tokenId);
        console.log('isForSale:', isForSale);
  
        if (isForSale) {
          nfts.push({
            tokenId: tokenId.toString(),
            price: price, 
          });
        }
      }
  
      setNftsForSale(nfts);
    } catch (err) {
      console.error(err);
      alert('Error fetching NFTs for sale');
    }
  }, [marketContract, nftContract]);
  
  const fetchMetadata = async (uri) => {
    // 使用 fetch 来获取元数据
    try {
      const response = await fetch(uri);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching metadata:', err);
      return null;
    }
  };
  
  // 获取用户的所有 NFT
  const fetchUserNFTs = useCallback(async () => {
    console.log('nftContract:', nftContract);
    console.log('account:', account);
  
    if (!nftContract || !account) return;
  
    try {
      const totalSupply = await nftContract.totalSupply();
      console.log('totalSupply',totalSupply.toString());
      const userNFTs = [];
      for (let i = 0; i < totalSupply.toNumber(); i++) {
        const tokenId = await nftContract.tokenByIndex(i);
        const owner = await nftContract.ownerOf(tokenId);
        const tokenURI = await nftContract.tokenURI(tokenId);  // 获取tokenURI
        console.log(tokenURI);
        const metadata = await fetchMetadata(tokenURI);  // 获取元数据
        console.log(metadata);
        console.log('owner of tokenId', tokenId.toString(), 'is', owner.toString());
        console.log(metadata.name);
        if (owner === account) {
          userNFTs.push({tokenId,metadata});
        }
      }
        setUserNFTs(userNFTs);
    } catch (err) {
      console.error(err);
      alert('Error fetching user NFTs');
    }
  }, [nftContract, account]);

  // 页面加载时获取市场上的 NFT
  useEffect(() => {
    if (marketContract) {
      fetchNftsForSale();
    }
  }, [marketContract, nftContract, fetchNftsForSale]);

  // 页面加载时获取用户的 NFT
  useEffect(() => {
    if (nftContract && account) {
      fetchUserNFTs();
    }
  }, [nftContract, account, fetchUserNFTs]);  

  return (
    <div className="App">
      {!account ? (
        <div className="center-container">
          <h1 className="main-title">NFT 交易平台</h1>
          <button onClick={connectWallet} className="connect-button">
            连接钱包
          </button>
        </div>
      ) : (
        <div className="content">
          {/* 已连接信息卡片 */}
          <div className="card connected-card">
            <p className="connected-info">
              连接方式为 <span className="address">{account}</span>
            </p>
          </div>

          {/* 铸造NFT部分 */}
          <div className="card">
            <h2>铸造一个NFT</h2>
            <input
              type="text"
              placeholder="输入令牌 CID"
              value={tokenCID}
              onChange={(e) => setTokenCID(e.target.value)}
              className="input-box"
            />
            <button onClick={mintNFT} disabled={loading} className="primary-button">
              {loading ? '铸造中...' : '铸造 NFT'}
            </button>
          </div>

          {/* 出售NFT部分 */}
          <div className="card">
            <h2>出售NFT</h2>
            <input
              type="number"
              placeholder="输入令牌 ID"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="input-box"
            />
            <input
              type="text"
              placeholder="输入价格 (ETH)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input-box"
            />
            <button
              onClick={listNFTForSale}
              disabled={loading}
              className="primary-button"
            >
              {loading ? '上架中...' : '上架 NFT'}
            </button>
          </div>

          {/* 你的NFT */}
          <div className="card">
            <h2>你的NFT</h2>
            {userNFTs.length === 0 ? (
              <p className="empty-message">你还没有自己的NFT</p>
            ) : (
              <div className="nft-gallery">
                {userNFTs.map(({ tokenId, metadata }) => (
                  <div className="nft-card" key={tokenId.toString()}>
                    <img src={metadata.image} alt={metadata.name} />
                    <h3>{metadata.name}</h3>
                    <p>{metadata.description}</p>
                    <button
                      onClick={() => delistNFT(tokenId)}
                      disabled={loading}
                      className="secondary-button"
                    >
                      {loading ? 'Removing...' : 'Remove from Sale'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 正在出售的NFT部分 */}
          <div className="card">
            <h2>正在出售的NFT</h2>
            {nftsForSale.length === 0 ? (
              <p className="empty-message">无NFT出售中</p>
            ) : (
              <div className="nft-gallery">
                {nftsForSale.map(({ tokenId, price }) => (
                  <div className="nft-card" key={tokenId.toString()}>
                    <h3>令牌 ID: {tokenId.toString()}</h3>
                    <p>价格: {price} ETH</p>
                    <button
                      onClick={() => buyNFT(tokenId, price)}
                      disabled={loading}
                      className="primary-button"
                    >
                      {loading ? '购买中...' : '购买 NFT'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
