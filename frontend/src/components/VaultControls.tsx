'use client'

import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { tokenAddress, vaultAddress, tokenAbi, vaultAbi } from '@/constants'


export default function VaultControls() {
    const { address } = useAccount()
    const [amount, setAmount] = useState('')
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

    const { data: vaultBal } = useReadContract({
        abi: tokenAbi,
        address: tokenAddress,
        functionName: 'balanceOf',
        args: [vaultAddress],
        watch: true,
    })

    const { data: ownerAddr } = useReadContract({
        abi: vaultAbi,
        address: vaultAddress,
        functionName: 'owner',
    })

    const { writeContract: approveToken } = useWriteContract()
    const { writeContract: sendToVault } = useWriteContract()
    const { writeContract: claimTokens } = useWriteContract()

    const { isLoading: isPending } = useWaitForTransactionReceipt({
        hash: txHash!,
        enabled: !!txHash,
        onSuccess() {
            toast.success('Transaction confirmed!')
            setTxHash(null)
        },
        onError() {
            toast.error('Transaction failed')
            setTxHash(null)
        },
    })

    const handleSend = async () => {
        const val = parseEther(amount)
        try {
            const approveTx = await approveToken({ abi: tokenAbi, address: tokenAddress, functionName: 'approve', args: [vaultAddress, val] })
            toast('Approving...')
            setTxHash(approveTx)
            const sendTx = await sendToVault({ abi: vaultAbi, address: vaultAddress, functionName: 'sendTokens', args: [val] })
            setTxHash(sendTx)
        } catch (err: any) {
            toast.error(err.shortMessage || 'Error sending')
        }
    }

    const handleClaim = async () => {
        try {
            const val = parseEther(amount)
            const tx = await claimTokens({ abi: vaultAbi, address: vaultAddress, functionName: 'claimTokens', args: [val] })
            setTxHash(tx)
        } catch (err: any) {
            toast.error(err.shortMessage || 'Error claiming')
        }
    }

    const isOwner = address?.toLowerCase() === ownerAddr?.toLowerCase()

    return (
        <div className="vault-ui">
            <h2>🏦 Vault Balance: {vaultBal ? Number(vaultBal) / 1e18 : 0} MTK</h2>

            <input
                className="input"
                placeholder="Amount (e.g. 10)"
                value={amount}
                onChange={e => setAmount(e.target.value)}
            />
            <button disabled={isPending} onClick={handleSend}>Send to Vault</button>

            {isOwner && (
                <button disabled={isPending} onClick={handleClaim}>Claim from Vault</button>
            )}
        </div>
    )
}
