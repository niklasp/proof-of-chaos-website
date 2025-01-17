import { Dialog } from "@headlessui/react";
import { castVote } from "../../data/vote-service";
import Button from "../ui/button";
import Input from "../ui/input";
import { useModal } from "./context";
import { toast } from 'react-toastify';
import { useEffect, useState } from "react";
import { getWalletBySource} from "@talisman-connect/wallets";
import useAppStore from "../../zustand";
import { useAccountVote } from "../../hooks/use-referendums";
import useAccountBalance from "../../hooks/use-account-balance";
import { microToKSM } from '../../utils'
import { isNumber } from "lodash";
import { InlineLoader } from "../ui/loader";

export default function ReferendumVoteModal( { id, title, userAnswers } ) {
  const { data: userVote } = useAccountVote( id );
  const { data: accountBalance, isLoading: isBalanceLoading } = useAccountBalance()
  const availableBalance = microToKSM( accountBalance?.data?.free )
  const { closeModal } = useModal();
  const VOTE_LOCK_OPTIONS = [
    {
      value: 'None',
      label: '0.1x - no lockup',
    },
    {
      value: 'Locked1x',
      label: '1x - locked for 1 enactment period (8 days)',
    },
    {
      value: 'Locked2x',
      label: '2x - locked for 2 enactment periods (16 days)',
    },
    {
      value: 'Locked3x',
      label: '3x - locked for 4 enactment periods (32 days)',
    },
    {
      value: 'Locked4x',
      label: '4x - locked for 8 enactment periods (64 days)',
    },
    {
      value: 'Locked5x',
      label: '5x - locked for 16 enactment periods (128 days)',
    },
    {
      value: 'Locked6x',
      label: '6x - locked for 32 enactment periods (256 days)',
    },
  ]

  const connectedAccountIndex = useAppStore((state) => state.user.connectedAccount)
  const connectedAccount = useAppStore((state) => state.user.connectedAccounts?.[connectedAccountIndex])
  const hasUserSubmittedAnswers = useAppStore((state) => state.user.quizAnswers?.[id]?.submitted )

  const [ state, setState ] = useState({
    'wallet-select': connectedAccount?.address,
    'vote-amount': '',
    'vote-lock': '',
    'availableBalance': '',
    userAnswers,
  })

  useEffect( () => {
    setState( {
      ...state,
      'vote-amount': userVote.balance,
      'vote-lock': userVote.conviction,
    })
  }, [ userVote ])

  const setFormFieldValue = (e) => {
    setState({
      ...state,
      [e.target.getAttribute('id')]: e.target.value,
    })
  }

  async function onClickCastVote(aye = true) {
    const balance = parseFloat(state['vote-amount']) * 1000000000000
    const wallet = getWalletBySource(connectedAccount.source)
    
    await wallet.enable('Proof of Chaos')
    try {
      toast.promise(
        castVote(
          wallet.signer,
          aye,
          id,
          state['wallet-select'],
          balance,
          state['vote-lock'],
          state['userAnswers']
        ).then( ( data ) => { console.log( 'castvotedata', data); closeModal() } ),
        {
          pending: `sending your vote for referendum ${ id }`,
          success: 'Vote successfully recorded 🗳️',
          error: {
            render({data}){
              // When the promise reject, data will contains the error
              return `Error recording vote 🤯: ${data}`
            }
          },
          pauseOnFocusLoss: false
        }
      )
    } catch (err) {
      console.log( '>>> err', err );
    }
  }

  const convictionString = userVote.conviction === 'None' ? 'no' : userVote.conviction?.substring(6);
  const voteAmountLabel = isBalanceLoading ? <>{`Value (available: ` } <InlineLoader /> {`)`} </> : `Value (available: ${ availableBalance?.toFixed( 2 ) } KSM)`

  return(
    <>
      <Dialog.Title as="h3" className="text-2xl font-medium leading-6 text-gray-900 pb-2">
        Vote on Referendum { id }
      </Dialog.Title>
      <div className="pr-4 overflow-y-scroll flex-1">
        <div className="mt-4">
          { title }
        </div>
        {
          hasUserSubmittedAnswers &&
          <div className="bg-emerald-600 text-white p-3 mt-4 rounded-lg text-sm">
          Thanks for answering those questions, your answers were successfully recorded. If you answered correctly, you will have a higher chance of receiving Rare and Epic Items for this Referendum.
          </div>
        }
        { userVote &&
            <div className="bg-amber-300 p-3 rounded-lg text-sm mt-4">
              You already voted <b>{ userVote.aye ? 'Aye' : 'Nay' }</b> on this referendum with <b>{ userVote.balance } KSM</b> and <b>{ convictionString }</b> conviction. <br /> Voting again will replace your current vote.
            </div>
          }
        <form className="mt-4 pl-1">
          <Input
            id="vote-amount"
            label={ voteAmountLabel }
            type="number"
            step="0.1"
            max={ isNaN(availableBalance) ? undefined : availableBalance }
            value={ state["vote-amount"] }
            className="text-base"
            placeholder={ userVote?.balance ?? '' }
            tooltip="The value is locked for the selected time below"
            onChange={setFormFieldValue.bind(this)}
          />
          <Input
            id="vote-lock"
            label="Vote Lock"
            type="select"
            className="text-xs sm:text-sm md:text-base"
            options={ VOTE_LOCK_OPTIONS }
            value={ state["vote-lock"] }
            tooltip="How long your value is locked - increases voting power"
            onChange={setFormFieldValue.bind(this)}
          />
        </form>
        <div className="mt-6">
          <Button
            className="mr-2 bg-gradient-to-r from-green-500/80 to-green-700/80 text-white"
            onClick={ async () => onClickCastVote(true) }>
            Vote Aye
          </Button>
          <Button
            className="mr-2 bg-gradient-to-r from-red-500/80 to-red-700/80 text-white text-4xl"
            onClick={ async () => onClickCastVote(false) }>
            Vote Nay
          </Button>
          <Button
            variant="calm"
            onClick={ closeModal }>
            Cancel
          </Button>
        </div>
      </div>
    </>
  )
}