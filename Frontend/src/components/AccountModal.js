import { useState } from 'react'
import copy from 'copy-to-clipboard'
import './accountmodal.css'

const AccountModal = ({ toggleModal, disconnectWallet, accountAddress }) => {
  const [copied, setCopied] = useState(false)

  const copyAddress = () => {
    copy(accountAddress)
    setCopied(true)

    setTimeout(() => setCopied(false), 300)
  }

  return (
    <div className="shim fade-in">
      <div className="modal">
        <div className="top">
          <h3>Account</h3>
          <button onClick={toggleModal}>
            <i className="material-icons-outlined">close</i>
          </button>
        </div>
        <div className="account-info">
          <span className="address">
            {accountAddress.substring(0, 4) +
              '...' +
              accountAddress.substring(
                accountAddress.length - 4,
                accountAddress.length
              )}
          </span>
          <button className="btn" onClick={copyAddress}>
            {!copied ? 'Copy Address' : 'Copied!'}
          </button>
          <button className="btn">
            <a
              href={'https://arbiscan.io//address/' + accountAddress}
              target="_blank"
              rel="noreferrer"
            >
              Explorer
            </a>
          </button>
        </div>
        <button className="btn-disconnect" onClick={disconnectWallet}>
          Disconnect
        </button>
      </div>
    </div>
  )
}

export default AccountModal
