import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import DOPEX_ABI from '../abis/dopex_abi.json'
import ClickAwayListener from 'react-click-away-listener'
import './form.css'

const Form = ({ provider, showNotification, showContractOwner }) => {
  const [selectOpen, setSelectOpen] = useState(false)
  const [selectedField, setSelectedField] = useState('Withdraw')
  const [strikeIndex, setStrikeIndex] = useState(0)
  const [sushiSlippage, setSushiSlippage] = useState(0)
  const [curveSlippage, setCurveSlippage] = useState(0)
  const [purchasePercent, setPurchasePercent] = useState(0)
  const [ssovAddress, setSsovAddress] = useState('')
  const [token, setToken] = useState('')
  const [addressTo, setAddressTo] = useState('')
  const [amount, setAmount] = useState(0)

  const arbitrumContract = new ethers.Contract(
    '0xE663f9c035214752dD5Ed55483162455CA920DDC',
    DOPEX_ABI,
    provider
  )
  const signer = provider.getSigner()

  useEffect(() => {
    console.log('changed', selectOpen)
  }, [selectOpen])

  const toggleSelect = () => {
    setSelectOpen(!selectOpen)
  }

  const selectField = (type) => {
    setSelectedField(type)
  }

  const handleClickAway = () => {
    setSelectOpen(false)
  }

  const deposit = async () => {
    try {
      const arbitrumContractWithSigner = arbitrumContract.connect(signer)
      await arbitrumContractWithSigner.deposit(amount)

      showNotification('success', 'Deposit was successful!')
    } catch (error) {
      showNotification('error', 'Error occured! Ensure all fields are valid.')
    }
  }

  const runStrategy = async () => {
    try {
      const arbitrumContractWithSigner = arbitrumContract.connect(signer)
      await arbitrumContractWithSigner.runStrategy(
        strikeIndex,
        sushiSlippage,
        curveSlippage,
        purchasePercent,
        ssovAddress
      )

      showNotification('success', 'Strategy was created successfully!')
    } catch (error) {
      showNotification('error', 'Error occured! Ensure all fields are valid.')
    }
  }

  const withdraw = async () => {
    try {
      const arbitrumContractWithSigner = arbitrumContract.connect(signer)
      await arbitrumContractWithSigner.withdraw(token, addressTo, amount)

      showNotification('success', 'Withdrawal was successful!')
    } catch (error) {
      showNotification('error', 'Error occured! Ensure all fields are valid.')
    }
  }

  const getContractOwner = async () => {
    try {
      const arbitrumContractWithSigner = arbitrumContract.connect(signer)
      const owner = await arbitrumContractWithSigner.s_owner()

      showContractOwner(owner)
    } catch (error) {
      showNotification('error', 'Error occured! Ensure all fields are valid.')
    }
  }

  
  const submit = (event) => {
    event.preventDefault()

    if (selectedField === 'Deposit') {
      deposit()
    } else if (selectedField === 'Withdraw') {
      withdraw()
    } else if (selectedField === 'Strategy') {
      runStrategy()
    } else {
      getContractOwner()
    }

    resetStates()
  }

  const resetStates = () => {
    setStrikeIndex(0)
    setSushiSlippage(0)
    setCurveSlippage(0)
    setPurchasePercent(0)
    setSsovAddress('')
    setToken('')
    setAddressTo('')
    setAmount(0)
  }

  return (
    <form className="deposit">
      <ClickAwayListener onClickAway={handleClickAway}>
        <div
          className={!selectOpen ? 'select-field' : 'select-field open'}
          onClick={toggleSelect}
        >
          <span>{selectedField}</span>
          <i className="material-icons-outlined">arrow_drop_down</i>
          {selectOpen ? (
            <div className="options" role="listbox">
              <span
                role="option"
                className={selectedField === 'Withdraw' ? 'active' : ''}
                aria-selected={selectedField === 'Withdraw'}
                onClick={() => selectField('Withdraw')}
              >
                Withdraw
              </span>
              <span
                role="option"
                className={selectedField === 'Strategy' ? 'active' : ''}
                aria-selected={selectedField === 'Strategy'}
                onClick={() => selectField('Strategy')}
              >
                Strategy
              </span>
              <span
                role="option"
                className={selectedField === 'Deposit' ? 'active' : ''}
                aria-selected={selectedField === 'Deposit'}
                onClick={() => selectField('Deposit')}
              >
                Deposit
              </span>
              <span
                role="option"
                className={selectedField === 'Get Contract Owner' ? 'active' : ''}
                aria-selected={selectedField === 'Get Contract Owner'}
                onClick={() => selectField('Get Contract Owner')}
              >
                Contract Owner
              </span>
            </div>
          ) : (
            <></>
          )}
        </div>
      </ClickAwayListener>
      {selectedField === 'Strategy' ? (
        <>
          <input
            type="number"
            placeholder="StrikeIndex"
            onChange={(event) => setStrikeIndex(event.target.value)}
          />
          <input
            type="number"
            placeholder="SushiSlippage"
            onChange={(event) => setSushiSlippage(event.target.value)}
          />
          <input
            type="number"
            placeholder="CurveSlippage"
            onChange={(event) => setCurveSlippage(event.target.value)}
          />
          <input
            type="number"
            placeholder="PurchasePercent"
            onChange={(event) => setPurchasePercent(event.target.value)}
          />
          <input
            type="text"
            placeholder="SSOVAddress"
            onChange={(event) => setSsovAddress(event.target.value)}
          />
        </>
      ) : (
        <></>
      )}

      {selectedField === 'Withdraw' ? (
        <>
          <input
            type="text"
            placeholder="Token"
            onChange={(event) => setToken(event.target.value)}
          />
          <input
            type="text"
            placeholder="To"
            onChange={(event) => setAddressTo(event.target.value)}
          />
          <input
            type="number"
            placeholder="amount"
            onChange={(event) => setAmount(event.target.value)}
          />
        </>
      ) : (
        <></>
      )}

      {selectedField === 'Deposit' ? (
        <>
          <input
            type="number"
            placeholder="amount"
            onChange={(event) => setAmount(event.target.value)}
          />
        </>
      ) : (
        <></>
      )}

      <button className="btn-primary" onClick={submit}>
        {selectedField[0].toUpperCase() + selectedField.slice(1)}
      </button>
    </form>
  )
}

export default Form
