import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Wallet, CircleArrowDown, CircleArrowUp, Copy, Check, AlertTriangle, Loader2, Landmark } from 'lucide-react'
import { formatCurrency, formatDate } from '../lib/utils'

export default function WalletPage() {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('deposit')
  const [depositMethod, setDepositMethod] = useState('crypto')
  const [withdrawMethod, setWithdrawMethod] = useState('crypto')
  const [selectedCurrency, setSelectedCurrency] = useState('USDT_TRC20')
  const [walletAddresses, setWalletAddresses] = useState([])
  const [banks, setBanks] = useState([])
  const [selectedBank, setSelectedBank] = useState('')
  const [inrRate, setInrRate] = useState(85)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const [depositAmount, setDepositAmount] = useState('')
  const [depositTxHash, setDepositTxHash] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)

  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  const [withdrawBank, setWithdrawBank] = useState({
    bank_name: user?.bank_name || '',
    account_holder: user?.bank_account_holder || '',
    account_number: user?.bank_account_number || '',
    ifsc: user?.bank_ifsc || '',
  })
  const [savingBank, setSavingBank] = useState(false)
  const [bankMessage, setBankMessage] = useState({ type: '', text: '' })

  const currencies = [
    { value: 'USDT_TRC20', label: 'USDT (TRC20)', network: 'TRON (TRC20)' },
    { value: 'USDT_ERC20', label: 'USDT (ERC20)', network: 'Ethereum (ERC20)' },
    { value: 'BTC', label: 'Bitcoin (BTC)', network: 'Bitcoin' },
    { value: 'ETH', label: 'Ethereum (ETH)', network: 'Ethereum' },
    { value: 'USDC', label: 'USD Coin (USDC)', network: 'Ethereum' },
  ]

  const quickAmounts = [50, 100, 250, 500]

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setDepositAmount('')
    setDepositTxHash('')
    setWithdrawAddress('')
    setWithdrawAmount('')
  }, [activeTab, selectedCurrency])

  useEffect(() => {
    setWithdrawBank(prev => {
      const next = { ...prev }
      if (!next.bank_name && user?.bank_name) next.bank_name = user.bank_name
      if (!next.account_holder && user?.bank_account_holder) next.account_holder = user.bank_account_holder
      if (!next.account_number && user?.bank_account_number) next.account_number = user.bank_account_number
      if (!next.ifsc && user?.bank_ifsc) next.ifsc = user.bank_ifsc
      return next
    })
  }, [user])

  async function fetchData() {
    try {
      const [walletsRes, txRes, banksRes, settingsRes] = await Promise.all([
        api.get('/wallets'),
        api.get('/transactions'),
        api.get('/banks').catch(() => ({ data: [] })),
        api.get('/settings').catch(() => ({ data: {} })),
      ])
      setWalletAddresses(walletsRes.data)
      setTransactions(txRes.data)
      const activeBanks = (banksRes.data || []).filter(b => b.is_active !== false)
      setBanks(activeBanks)
      if (activeBanks.length > 0) setSelectedBank(activeBanks[0]._id)
      if (settingsRes.data?.inr_rate) setInrRate(Number(settingsRes.data.inr_rate))
    } catch (err) {
      console.error('Failed to fetch wallet data:', err)
    } finally {
      setLoading(false)
    }
  }

  function copyAddress(address) {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getNetwork(currency) {
    const c = currencies.find(c => c.value === currency)
    return c ? c.network : currency
  }

  function getCurrencyLabel(currency) {
    const c = currencies.find(c => c.value === currency)
    return c ? c.label : currency
  }

  async function handleDeposit(e) {
    e.preventDefault()
    setDepositLoading(true)
    try {
      const isBank = depositMethod === 'bank'
      await api.post('/transactions', {
        type: 'deposit',
        method: isBank ? 'Bank Transfer' : selectedCurrency,
        amount: isBank ? undefined : parseFloat(depositAmount),
        amount_inr: isBank ? parseFloat(depositAmount) : undefined,
        tx_hash: depositTxHash || undefined,
      })
      setDepositAmount('')
      setDepositTxHash('')
      const txRes = await api.get('/transactions')
      setTransactions(txRes.data)
    } catch (err) {
      console.error('Deposit request failed:', err)
    } finally {
      setDepositLoading(false)
    }
  }

  async function handleWithdraw(e) {
    e.preventDefault()
    setWithdrawLoading(true)
    try {
      if (withdrawMethod === 'bank') {
        await api.post('/transactions', {
          type: 'withdrawal',
          method: 'Bank Transfer',
          amount_inr: parseFloat(withdrawAmount),
        })
      } else {
        await api.post('/transactions', {
          type: 'withdrawal',
          method: selectedCurrency,
          amount: parseFloat(withdrawAmount),
          wallet_address: withdrawAddress,
        })
      }
      setWithdrawAddress('')
      setWithdrawAmount('')
      const txRes = await api.get('/transactions')
      setTransactions(txRes.data)
    } catch (err) {
      console.error('Withdrawal request failed:', err)
    } finally {
      setWithdrawLoading(false)
    }
  }

  async function handleSaveBank(e) {
    e.preventDefault()
    if (!withdrawBank.bank_name || !withdrawBank.account_holder || !withdrawBank.account_number) {
      setBankMessage({ type: 'error', text: 'Bank name, account holder and account number are required.' })
      return
    }
    setSavingBank(true)
    setBankMessage({ type: '', text: '' })
    try {
      const { data } = await api.put('/auth/me', {
        bank_name: withdrawBank.bank_name,
        bank_account_holder: withdrawBank.account_holder,
        bank_account_number: withdrawBank.account_number,
        bank_ifsc: withdrawBank.ifsc,
      })
      updateUser({
        bank_name: data.bank_name,
        bank_account_holder: data.bank_account_holder,
        bank_account_number: data.bank_account_number,
        bank_ifsc: data.bank_ifsc,
      })
      setBankMessage({ type: 'success', text: 'Bank details saved successfully.' })
    } catch (err) {
      setBankMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save bank details.' })
    } finally {
      setSavingBank(false)
    }
  }

  const balance = user?.balance || 0
  const currentAddress = walletAddresses.find(w => w.currency === selectedCurrency)
  const maxWithdraw = Math.min(balance, parseFloat(withdrawAmount) || 0) > balance ? balance : parseFloat(withdrawAmount) || 0
  const maxInr = Math.round((balance * inrRate) * 100) / 100
  const withdrawInr = parseFloat(withdrawAmount) || 0
  const bankInfoSaved = !!(user?.bank_name && user?.bank_account_holder && user?.bank_account_number)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-sky-500" />
          </div>
          <p className="text-sm text-gray-400">Available Balance</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(balance)} USDT
          </p>
          {!user?.withdrawal_enabled && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">
              <AlertTriangle className="w-3 h-3" />
              Withdrawals Disabled
            </span>
          )}
        </div>
      </div>

      <div className="flex bg-white border border-sky-100 rounded-xl p-1 shadow-sm">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'deposit'
              ? 'bg-sky-50 text-sky-600 border border-sky-200'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <CircleArrowDown className="w-4 h-4" />
          Deposit
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'withdraw'
              ? 'bg-sky-50 text-sky-600 border border-sky-200'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <CircleArrowUp className="w-4 h-4" />
          Withdraw
        </button>
      </div>

      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
        {activeTab === 'deposit' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Deposit Method</label>
            <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setDepositMethod('crypto')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  depositMethod === 'crypto'
                    ? 'bg-white text-sky-600 shadow-sm border border-sky-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Wallet className="w-4 h-4" />
                Crypto
              </button>
              <button
                type="button"
                onClick={() => setDepositMethod('bank')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  depositMethod === 'bank'
                    ? 'bg-white text-sky-600 shadow-sm border border-sky-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Landmark className="w-4 h-4" />
                India Bank
              </button>
            </div>
          </div>
        )}

        {activeTab === 'withdraw' && withdrawMethod !== 'bank' || (activeTab === 'deposit' && depositMethod === 'crypto') ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Currency</label>
            <select
              value={selectedCurrency}
              onChange={e => setSelectedCurrency(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              {currencies.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        ) : null}

        {activeTab === 'deposit' && depositMethod === 'bank' && (
          <form onSubmit={handleDeposit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Select Bank Account</label>
              <select
                value={selectedBank}
                onChange={e => setSelectedBank(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                required
              >
                {banks.length === 0 && (
                  <option value="">No bank accounts available</option>
                )}
                {banks.map(b => (
                  <option key={b._id} value={b._id}>{b.bank_name} ({b.account_holder})</option>
                ))}
              </select>
            </div>

            {selectedBank && (() => {
              const bank = banks.find(b => b._id === selectedBank)
              if (!bank) return null
              const copyField = (text) => {
                navigator.clipboard.writeText(text || '')
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }
              const rows = [
                { label: 'Bank Name', value: bank.bank_name },
                { label: 'Account Holder', value: bank.account_holder },
                { label: 'Account Number', value: bank.account_number },
                { label: 'IFSC Code', value: bank.ifsc_code },
                { label: 'UPI ID', value: bank.upi_id },
                { label: 'Branch', value: bank.branch },
              ].filter(r => r.value)
              return (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5">
                  <p className="text-sm text-gray-500">
                    Transfer <span className="text-gray-800 font-medium">INR</span> to this account and enter the UTR below.
                  </p>
                  {rows.map(r => (
                    <div key={r.label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-400">{r.label}</span>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs text-sky-600 font-mono">{r.value}</code>
                        <button
                          type="button"
                          onClick={() => copyField(r.value)}
                          className="p-1 rounded hover:bg-white transition-colors"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                  {bank.note && <p className="text-xs text-gray-400 mt-1">{bank.note}</p>}
                </div>
              )
            })()}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Amount (INR)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="5000"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                required
              />
              <p className="text-xs text-gray-400">
                Rate: ₹{inrRate} = 1 USDT · You will receive{' '}
                <span className="text-gray-800 font-medium">
                  ~{(parseFloat(depositAmount) || 0) / inrRate} USDT
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">UTR / Transaction Reference</label>
              <input
                type="text"
                value={depositTxHash}
                onChange={e => setDepositTxHash(e.target.value)}
                placeholder="Enter the UTR number from your bank transfer"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={depositLoading || !depositAmount || !depositTxHash || !selectedBank}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {depositLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CircleArrowDown className="w-5 h-5" />
              )}
              Submit Bank Deposit Request
            </button>

            <p className="text-xs text-gray-400 text-center">
              Bank deposits are manually approved by admin.
            </p>
          </form>
        )}

        {activeTab === 'deposit' && depositMethod === 'crypto' && (
          <form onSubmit={handleDeposit} className="space-y-4">
            {currentAddress && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm text-gray-500">
                  Send <span className="text-gray-800 font-medium">{getCurrencyLabel(selectedCurrency)}</span> to this address
                </p>
                <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 border border-gray-100">
                  <code className="flex-1 text-sm text-sky-600 font-mono break-all select-all">
                    {currentAddress.address}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyAddress(currentAddress.address)}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Only send via <span className="font-medium">{getNetwork(selectedCurrency)}</span> network. Sending any other asset may result in permanent loss.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Amount (USDT)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                required
              />
              <div className="flex gap-2">
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setDepositAmount(amount.toString())}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      depositAmount === amount.toString()
                        ? 'bg-sky-50 text-sky-600 border border-sky-200'
                        : 'bg-gray-100 text-gray-500 border border-gray-200 hover:text-gray-700'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Transaction Hash (Optional)</label>
              <input
                type="text"
                value={depositTxHash}
                onChange={e => setDepositTxHash(e.target.value)}
                placeholder="Enter tx hash after sending"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={depositLoading || !depositAmount}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {depositLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CircleArrowDown className="w-5 h-5" />
              )}
              Submit Deposit Request
            </button>

            <p className="text-xs text-gray-400 text-center">
              Deposits are manually approved by admin.
            </p>
          </form>
        )}

{activeTab === 'withdraw' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Withdraw Method</label>
              <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setWithdrawMethod('crypto')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                    withdrawMethod === 'crypto'
                      ? 'bg-white text-sky-600 shadow-sm border border-sky-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  Crypto
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawMethod('bank')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                    withdrawMethod === 'bank'
                      ? 'bg-white text-sky-600 shadow-sm border border-sky-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  India Bank
                </button>
              </div>
            </div>

            {withdrawMethod === 'bank' ? (
              <>
                <form onSubmit={handleSaveBank} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                      <input
                        type="text"
                        value={withdrawBank.bank_name}
                        onChange={(e) => setWithdrawBank({ ...withdrawBank, bank_name: e.target.value })}
                        placeholder="HDFC Bank"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Account Holder</label>
                      <input
                        type="text"
                        value={withdrawBank.account_holder}
                        onChange={(e) => setWithdrawBank({ ...withdrawBank, account_holder: e.target.value })}
                        placeholder="Name on account"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Account Number</label>
                      <input
                        type="text"
                        value={withdrawBank.account_number}
                        onChange={(e) => setWithdrawBank({ ...withdrawBank, account_number: e.target.value })}
                        placeholder="Account number"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                      <input
                        type="text"
                        value={withdrawBank.ifsc}
                        onChange={(e) => setWithdrawBank({ ...withdrawBank, ifsc: e.target.value })}
                        placeholder="HDFC0001234"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      />
                    </div>
                  </div>
                  {bankMessage.text && (
                    <p className={`text-sm font-medium ${bankMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {bankMessage.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={savingBank}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-lg bg-white border border-sky-200 text-sky-600 text-sm font-semibold hover:bg-sky-50 transition-colors disabled:opacity-50"
                  >
                    {savingBank ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {bankInfoSaved ? 'Update Bank Details' : 'Save Bank Details'}
                  </button>
                </form>

                <div className="border-t border-gray-100 my-4" />

                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Amount (INR)</label>
                    <input
                      type="number"
                      min="1"
                      max={maxInr}
                      step="1"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="1000"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      required
                    />
                    <p className="text-xs text-gray-400">
                      Rate: ₹{inrRate} = 1 USDT · You will pay{' '}
                      <span className="text-gray-800 font-medium">~{(withdrawInr / inrRate).toFixed(2)} USDT</span> · Max: ₹{maxInr}
                    </p>
                  </div>

                  {!bankInfoSaved && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        Save your bank details above before requesting a bank withdrawal.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={withdrawLoading || !withdrawAmount || !bankInfoSaved || withdrawInr > maxInr || !user?.withdrawal_enabled}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CircleArrowUp className="w-5 h-5" />
                    )}
                    Submit Bank Withdrawal Request
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    Withdrawals are manually approved by admin. Balance is deducted on approval.
                  </p>
                </form>
              </>
            ) : (
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Withdrawal Address</label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder={`Enter your ${getCurrencyLabel(selectedCurrency)} address`}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Amount (USDT)</label>
                  <input
                    type="number"
                    min="1"
                    max={balance}
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    required
                  />
                  <p className="text-xs text-gray-400">Max: {formatCurrency(balance)} USDT</p>
                </div>

                <button
                  type="submit"
                  disabled={withdrawLoading || !withdrawAmount || !withdrawAddress || !user?.withdrawal_enabled}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CircleArrowUp className="w-5 h-5" />
                  )}
                  Submit Withdrawal Request
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Withdrawals are manually approved by admin.
                </p>
              </form>
            )}
          </>
        )}
      </div>

      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Type</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Amount</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Method</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {tx.type === 'deposit' ? (
                          <CircleArrowDown className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <CircleArrowUp className="w-4 h-4 text-amber-600" />
                        )}
                        <span className="capitalize text-gray-800">{tx.type}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-800 font-medium">
                      {formatCurrency(tx.amount)} USDT
                      {tx.amount_inr > 0 && (
                        <span className="text-gray-400 font-normal"> · ₹{tx.amount_inr}</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-gray-400">{tx.method}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        tx.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-600'
                          : tx.status === 'rejected'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-400">{formatDate(tx.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
