'use client'

import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { tokenAddress, vaultAddress, tokenAbi, vaultAbi } from '@/constants'

interface Transaction {
    hash: `0x${string}`
    type: 'approve' | 'send' | 'claim'
    amount: string
    timestamp: Date
    status: 'pending' | 'confirmed' | 'failed'
}

export default function VaultControls() {
    const { address } = useAccount()
    const [amount, setAmount] = useState('')
    const [isApproving, setIsApproving] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [isClaiming, setIsClaiming] = useState(false)
    const [txHistory, setTxHistory] = useState<Transaction[]>([])
    const [userBalance, setUserBalance] = useState<bigint>(BigInt(0))

    // Fetch balances
    const { data: vaultBal, refetch: refetchVault } = useReadContract({
        abi: tokenAbi,
        address: tokenAddress,
        functionName: 'balanceOf',
        args: [vaultAddress],
        // watch: true,
    })

    const { data: userBal, refetch: refetchUserBalance } = useReadContract({
        abi: tokenAbi,
        address: tokenAddress,
        functionName: 'balanceOf',
        args: [address],
        // watch: true,
    })

    useEffect(() => {
        if (userBal !== undefined) {
            setUserBalance(userBal as bigint)
        }
    }, [userBal])

    const { data: ownerAddr } = useReadContract({
        abi: vaultAbi,
        address: vaultAddress,
        functionName: 'owner',
    })

    // Write contracts
    const { writeContractAsync: approveToken } = useWriteContract()
    const { writeContractAsync: sendToVault } = useWriteContract()
    const { writeContractAsync: claimTokens } = useWriteContract()

    // Validate amount
    const isValidAmount = () => {
        if (!amount) return false
        const amountWei = parseEther(amount)
        return amountWei > BigInt(0) && amountWei <= userBalance
    }

    // Handle send transaction
    const handleSend = async () => {
        if (!isValidAmount()) {
            toast.error('Invalid amount')
            return
        }

        try {
            setIsApproving(true)
            const val = parseEther(amount)

            // Add to transaction history
            const approveTx = {
                hash: '0x0' as `0x${string}`,
                type: 'approve' as const,
                amount: amount,
                timestamp: new Date(),
                status: 'pending' as const
            }
            setTxHistory(prev => [approveTx, ...prev])

            const approveHash = await approveToken({
                abi: tokenAbi,
                address: tokenAddress,
                functionName: 'approve',
                args: [vaultAddress, val]
            })

            // Update history with real hash
            setTxHistory(prev => prev.map(tx =>
                tx.hash === '0x0' ? { ...tx, hash: approveHash } : tx
            ))

            toast('Approving tokens...')

            setIsApproving(false)
            setIsSending(true)

            // Add send transaction to history
            const sendTx = {
                hash: '0x0' as `0x${string}`,
                type: 'send' as const,
                amount: amount,
                timestamp: new Date(),
                status: 'pending' as const
            }
            setTxHistory(prev => [sendTx, ...prev])

            const sendHash = await sendToVault({
                abi: vaultAbi,
                address: vaultAddress,
                functionName: 'sendTokens',
                args: [val]
            })

            // Update history with real hash
            setTxHistory(prev => prev.map(tx =>
                tx.hash === '0x0' ? { ...tx, hash: sendHash } : tx
            ))

            toast.success('Tokens sent to vault!')
            refetchVault()
            refetchUserBalance()
            setAmount('')
        } catch (err: any) {
            toast.error(err.shortMessage || 'Error sending tokens')
            // Update history with failure
            setTxHistory(prev => prev.map(tx =>
                tx.status === 'pending' ? { ...tx, status: 'failed' } : tx
            ))
        } finally {
            setIsApproving(false)
            setIsSending(false)
        }
    }

    // Handle claim transaction
    const handleClaim = async () => {
        if (!isValidAmount()) {
            toast.error('Invalid amount')
            return
        }

        try {
            setIsClaiming(true)
            const val = parseEther(amount)

            // Add to transaction history
            const claimTx = {
                hash: '0x0' as `0x${string}`,
                type: 'claim' as const,
                amount: amount,
                timestamp: new Date(),
                status: 'pending' as const
            }
            setTxHistory(prev => [claimTx, ...prev])

            const claimHash = await claimTokens({
                abi: vaultAbi,
                address: vaultAddress,
                functionName: 'claimTokens',
                args: [val]
            })

            // Update history with real hash
            setTxHistory(prev => prev.map(tx =>
                tx.hash === '0x0' ? { ...tx, hash: claimHash } : tx
            ))

            toast.success('Tokens claimed from vault!')
            refetchVault()
            refetchUserBalance()
            setAmount('')
        } catch (err: any) {
            toast.error(err.shortMessage || 'Error claiming tokens')
            // Update history with failure
            setTxHistory(prev => prev.map(tx =>
                tx.status === 'pending' ? { ...tx, status: 'failed' } : tx
            ))
        } finally {
            setIsClaiming(false)
        }
    }

    const isOwner = typeof address === 'string' && typeof ownerAddr === 'string' && address.toLowerCase() === ownerAddr.toLowerCase()

    return (
        <div className="max-w-2xl mx-auto bg-gray-900 text-white p-6 rounded-xl shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Token Vault Controls</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        Connected to {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
                    </div>
                </div>

                <div className="bg-blue-900/30 px-4 py-2 rounded-lg border border-blue-700">
                    <div className="text-sm text-blue-300">Vault Balance</div>
                    <div className="text-xl font-bold">
                        {vaultBal ? Number(formatEther(vaultBal as bigint)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} MTK
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-800 p-5 rounded-xl">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                        Deposit Tokens
                    </h2>

                    <div className="mb-4">
                        <label className="block text-sm text-gray-400 mb-2">Amount to deposit</label>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={() => setAmount(formatEther(userBalance))}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 rounded"
                            >
                                MAX
                            </button>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            Your balance: {userBalance ? Number(formatEther(userBalance)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} MTK
                        </div>
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={isApproving || isSending || !isValidAmount()}
                        className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${isApproving || isSending
                                ? 'bg-blue-700 cursor-not-allowed'
                                : isValidAmount()
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-gray-700 cursor-not-allowed'
                            }`}
                    >
                        {isApproving ? (
                            <>
                                <span>Approving...</span>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            </>
                        ) : isSending ? (
                            <>
                                <span>Sending...</span>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            </>
                        ) : (
                            'Deposit to Vault'
                        )}
                    </button>
                </div>

                {isOwner && (
                    <div className="bg-gray-800 p-5 rounded-xl">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm7-10a1 1 0 01.967.744L14.146 7.2 13.047 14.01c-.04.3-.068.511-.068.561a.5.5 0 01-.5.5h-4a.5.5 0 01-.5-.5c0-.05-.028-.26-.068-.561L9.854 7.2l1.179-4.456A1 1 0 0112 2zm3 10a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Claim Tokens
                        </h2>

                        <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-2">Amount to claim</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <button
                                    onClick={() => setAmount(formatEther(vaultBal as bigint || BigInt(0)))}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-600 hover:bg-green-700 text-xs px-2 py-1 rounded"
                                >
                                    MAX
                                </button>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                Vault balance: {vaultBal ? Number(formatEther(vaultBal as bigint)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} MTK
                            </div>
                        </div>

                        <button
                            onClick={handleClaim}
                            disabled={isClaiming || !isValidAmount()}
                            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${isClaiming
                                    ? 'bg-green-700 cursor-not-allowed'
                                    : isValidAmount()
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-gray-700 cursor-not-allowed'
                                }`}
                        >
                            {isClaiming ? (
                                <>
                                    <span>Claiming...</span>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                </>
                            ) : (
                                'Claim from Vault'
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Transaction History */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Transaction History
                </h2>

                {txHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No transactions yet
                    </div>
                ) : (
                    <div className="bg-gray-800 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-750">
                                <tr>
                                    <th className="py-3 px-4 text-left text-sm text-gray-400">Type</th>
                                    <th className="py-3 px-4 text-left text-sm text-gray-400">Amount</th>
                                    <th className="py-3 px-4 text-left text-sm text-gray-400">Time</th>
                                    <th className="py-3 px-4 text-left text-sm text-gray-400">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {txHistory.map((tx, index) => (
                                    <tr key={index} className="border-b border-gray-700 last:border-0">
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${tx.type === 'approve'
                                                    ? 'bg-blue-900/30 text-blue-300'
                                                    : tx.type === 'send'
                                                        ? 'bg-purple-900/30 text-purple-300'
                                                        : 'bg-green-900/30 text-green-300'
                                                }`}>
                                                {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">{tx.amount} MTK</td>
                                        <td className="py-3 px-4 text-sm text-gray-400">
                                            {tx.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="py-3 px-4">
                                            {tx.status === 'pending' ? (
                                                <span className="text-yellow-500 flex items-center gap-1">
                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-500"></div>
                                                    Pending
                                                </span>
                                            ) : tx.status === 'confirmed' ? (
                                                <span className="text-green-500 flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    Confirmed
                                                </span>
                                            ) : (
                                                <span className="text-red-500 flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                    Failed
                                                </span>
                                            )}
                                        </td>
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