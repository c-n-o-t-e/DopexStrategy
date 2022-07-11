import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { NotificationContainer, NotificationManager } from 'react-notifications'
import 'react-notifications/lib/notifications.css'
import AccountModal from './components/AccountModal'
import Form from './components/Form'
import './App.css'

const App = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [accountAddress, setAccountAddress] = useState('')
  const [accountBalance, setAccountBalance] = useState('')
  const [owner, setOwner] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  const { ethereum } = window
  let provider = null

  if (ethereum) provider = new ethers.providers.Web3Provider(window.ethereum)

  useEffect(() => {
    const { ethereum } = window

    const checkMetamaskAvailability = () => {
      if (!ethereum) {
        showNotification(
          'error',
          'Metamask must be installed to use this client.'
        )
      }
    }

    checkMetamaskAvailability()
  }, [])

  const connectWallet = async () => {
    try {
      if (!ethereum) {
        showNotification('error', 'You need Metamask to use this client.')
      }

      const accounts = await window.ethereum
        .request({
          method: 'wallet_requestPermissions',
          params: [
            {
              eth_accounts: {},
            },
          ],
        })
        .then(() =>
          ethereum.request({
            method: 'eth_requestAccounts',
          })
        )

      if (ethereum.chainId !== '0x66EEB') {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x66EEB' }],
          })
        } catch (err) {
          if (err.code === 4902) {
            const chainData = {
              chainId: '0x66EEB',
              chainName: 'Arbitrum One',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://rinkeby.arbitrum.io/rpc'],
              blockExplorerUrls: ['https://arbiscan.io'],
            }

            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [chainData],
              })
            } catch (error) {
              showNotification('error', 'Failed to add chain.')
            }
          }
        }
      }

      let balance = await provider.getBalance(accounts[0])
      balance = ethers.utils.formatEther(balance)

      setAccountAddress(accounts[0])
      setAccountBalance(balance)
      setIsConnected(true)
    } catch (error) {
      setIsConnected(false)
    }
  }

  const disconnectWallet = async () => {
    setModalOpen(false)
    setIsConnected(false)
    setAccountAddress('')
    setAccountBalance('')
  }

  const toggleModal = () => {
    setModalOpen(!modalOpen)
  }

  const getBalance = () => {
    return parseInt(accountBalance).toFixed(1).length > 10
      ? parseInt(accountBalance).toFixed(1).toString().substring(0, 2) + '..'
      : parseInt(accountBalance).toFixed(1)
  }

  const showNotification = (type, message) => {
    if (type === 'success') {
      NotificationManager.success(message)
    } else {
      NotificationManager.error(message)
    }
  }

  const showContractOwner = (owner) => {
    setOwner(owner)
  }

  return (
    <main className="App">
      <nav>
        <img src="https://app.dopex.io/images/brand/logo.svg" alt="logo" />

        <div className="wrapper">
          {isConnected ? (
            <div className="account">
              <button onClick={toggleModal}>
                {accountAddress.substring(0, 4) +
                  '...' +
                  accountAddress.substring(
                    accountAddress.length - 4,
                    accountAddress.length
                  )}
              </button>
              <div>
                {getBalance()} <span> ETH</span>
              </div>
            </div>
          ) : (
            <button className="btn-primary" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
          <button disabled>
            <img
              src="https://app.dopex.io/images/networks/arbitrum.svg"
              alt="arbitrum"
            />
            Arbitrum
          </button>
        </div>
      </nav>

      <Form
        provider={provider}
        showNotification={showNotification}
        showContractOwner={showContractOwner}
      />

      {owner.length > 0 ? <div class="contract-owner fade-in">{owner}</div> : <></>}

      {modalOpen ? (
        <AccountModal
          toggleModal={toggleModal}
          disconnectWallet={disconnectWallet}
          accountAddress={accountAddress}
        />
      ) : (
        <></>
      )}

      <NotificationContainer />
    </main>
  )
}

export default App
