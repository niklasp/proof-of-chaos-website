import { ApiPromise, WsProvider } from '@polkadot/api';
import { ApolloClient, InMemoryCache, gql as agql } from '@apollo/client';
import {websiteConfig} from "../data/website-config";
import { useQuery } from "@tanstack/react-query";
import useAppStore from "../zustand";
import { joinArrays, KSMFormatted, microToKSM, microToKSMFormatted, getEndDateByBlock } from "../utils";
import { getApi } from '../data/chain';
import { getQuizDataForRef } from './use-quizzes';
import { reject } from 'lodash';
import { QUERY_REFERENDUMS } from "./queries";


const BLOCK_DURATION = 6000;
const THRESHOLD_SUPERMAJORITYAPPROVE = 'SuperMajorityApprove'
const THRESHOLD_SUPERMAJORITYAGAINST = 'SuperMajorityAgainst'
const THRESHOLD_SIMPLEMAJORITY = 'SimpleMajority'

const convictionMultiplierMapping = {
  'None': 0.1,
  'Locked1x': 1,
  'Locked2x': 2,
  'Locked3x': 3,
  'Locked4x': 4,
  'Locked5x': 5,
  'Locked6x': 6,
}

export const pastReferendumFetcher = async () => {
  return new Promise( async ( resolve ) => {
    const client = new ApolloClient({
      uri: websiteConfig.proofofchaos_graphql_endpoint,
      cache: new InMemoryCache(),
    })

    let result = await client.query({
      query: QUERY_REFERENDUMS,
      variables: {
        "where": {
          "endedAt_isNull": false
        },
        "orderBy": "index_DESC",
        "limit": 20
      }
    })

    const pastReferendums20 = result.data.referendums.map( ref => ref.index )
    let pastReferendaStats20 = result.data.referendaStats.filter( ref => pastReferendums20.includes( ref.index ) )
    const pastReferendaPAData20 = await getPADataForRefs( pastReferendums20 )
    
    // join the referendums from our indexer with the data from Polkassembly
    pastReferendaStats20 = pastReferendaStats20.map( (ref, idx) => {
      return {
        ...ref,
        title: pastReferendaPAData20.find( el => el.onchain_link.onchain_referendum_id === ref.index )?.title,
        description: pastReferendaPAData20.find( el => el.onchain_link.onchain_referendum_id === ref.index )?.content,
      }
    })

    const sortedReferendaStats = pastReferendaStats20.sort((a,b)=>parseInt(b.index)-parseInt(a.index))
    resolve( sortedReferendaStats )
  })
  // const wsProvider = new WsProvider('wss://kusama-rpc.polkadot.io');
  // const api = await ApiPromise.create({ provider: wsProvider });

  // const { hash, number } = await api.rpc.chain.getHeader();
  // const timestamp = await api.query.timestamp.now.at(hash);
  // const totalIssuance = await api.query.balances.totalIssuance().toString()
  // const pastReferendums = [226,227,228]

  // let referendums = [];
  // for (const referendum of pastReferendums) {

  //   // const endDate = await getEndDateByBlock(referendum.status.end, number, timestamp)
  //   const PAData = await getPADataForRefs(referendum);
  //   // const threshold = getPassingThreshold(referendum, totalIssuance)
  //   referendums.push(PAData);
  // }

  // return referendums.sort((a,b)=>parseInt(a.id)-parseInt(b.id));
};

export const activeReferendumFetcher = async (ksmAddress) => {
  const api = await getApi()

  const { hash, number } = await api.rpc.chain.getHeader();

  const timestamp = await api.query.timestamp.now.at(hash);
  const totalIssuance = await api.query.balances.totalIssuance().toString()
  const activeReferendums = await api.derive.democracy.referendums()
  let referendums = [];
  for (const referendum of activeReferendums) {
    /* DOODLE LOOKING AT TRESHOLD / finding proposals (probably requires Subsquid API)
    console.log(referendum.imageHash.toString());
    const info = await api.query.democracy.referendumInfoOf(referendum.index)
    console.log(info.toHuman())
    const proposalhash = info.unwrap().asOngoing.proposalHash
    console.log(proposalhash.toString())
    let props = await api.query.democracy.preimages.entries()
    //console.log(props)
    props.forEach(([_, maybePreImage]) => {
      let perImage = maybePreImage.unwrapOrDefault();
      console.log(perImage.asAvailable.data.toString())
    })*/
    //const info = await api.query.democracy.referendumInfoOf(referendum.index)
    //const proposalhash = info.unwrap().asOngoing.proposalHash
    //console.log("!",referendum.imageHash.toString())

    const endDate = await getEndDateByBlock(referendum.status.end, number, timestamp)
    const PAData = await getPADataForRefs([referendum.index.toString()]);
    const PADatum = PAData?.[0]
    const quizData = await getQuizDataForRef(referendum.index.toString());
    const threshold = getPassingThreshold(referendum, totalIssuance)
    referendums.push(referendumObject(referendum, threshold, endDate, PADatum, quizData.quizzes, ksmAddress));
  }

  return referendums.sort((a,b)=>parseInt(a.id)-parseInt(b.id));
};

const getPassingThreshold = (referendum, totalIssuance) => {
  return true; /* TODO: incorporate treshold formulas */
  switch (referendum.status.threshold.toString()) {
    case THRESHOLD_SUPERMAJORITYAPPROVE:
      break;
    case THRESHOLD_SIMPLEMAJORITY:
    default:
      return parseInt(referendum.votedTotal.toString()) / 2
  }
}

async function getPADataForRefs(referendumIDs) {
  return new Promise( async ( resolve ) => {
    const client = new ApolloClient({
      uri: websiteConfig.polkassembly_graphql_endpoint,
      cache: new InMemoryCache(),
    })

    let result = await client.query({
      operationName: "ReferendumPostAndComments",
      query: agql`
        query ReferendumPostAndComments($ids: [Int!]) {
          posts(where: {onchain_link: {onchain_referendum_id: {_in: $ids}}}) {
            ...referendumPost
          }
        }
        fragment referendumPost on posts {
          content
          created_at
          title
          onchain_link {
            onchain_referendum_id
          }
        }
    `,
      variables: {
        "ids": [...referendumIDs]
      }
    })

    resolve(result?.data?.posts)
  })
}

const toPercentage = (part, whole) => {
  return Math.round(parseInt(part) / parseInt(whole) * 100)
}

const parseCastVote = (vote) => {
  if (!vote) {
    return null
  }

  return {
    aye: vote.vote?.isAye,
    balance: parseInt(vote.balance?.toString()) / 1000000000000,
    conviction: vote.vote?.conviction?.toString(),
  }
}

const referendumObject = (referendum, threshold, endDate, PAData, quizData, ksmAddress) => {
  let title = PAData?.title

  if (!title && referendum.image) {
    title = referendum.image.proposal.section.toString() + '.' + referendum.image.proposal.method.toString()
  }
  //getlatestversion
  let latestQuiz = quizData.sort((a,b)=>parseInt(b.version)-parseInt(a.version))[0]
  let allSubmissions = []
  //write submissions from all versions together in one array
  quizData.forEach(quizVersion => {
    allSubmissions.push(...quizVersion.submissions)
  });
  /* DOODLE LOOKING AT CONVICTION
  let ayeTotal = 0;
  let nayTotal = 0;
  referendum.votes.forEach((vote) => {
    const balance = parseInt(vote.vote?.conviction?.toString())
    const convictionMultiplier = convictionMultiplierMapping[vote.vote?.conviction?.toString()]
    const votePower = balance * convictionMultiplier
    if (vote.vote?.isAye) {
      ayeTotal += votePower
    } else {
      nayTotal += votePower
    }
  });
  console.log(ayeTotal, nayTotal)*/

  const votedTotal = parseInt(referendum.votedAye.toString()) + parseInt(referendum.votedNay.toString())

  return {
    id: referendum.index.toString(),
    title: title,
    voteVolume: microToKSM(referendum.votedTotal.toString()),
    aye: {
      vote: referendum.voteCountAye,
      percentage: toPercentage(referendum.votedAye.toString(), votedTotal),
      voteVolume: microToKSMFormatted(referendum.votedAye.toString()),
    },
    nay: {
      vote: referendum.voteCountNay,
      percentage: toPercentage(referendum.votedNay.toString(), votedTotal),
      voteVolume: microToKSMFormatted(referendum.votedNay.toString()),
    },
    executed_at: endDate,
    proposed_by: {
      id: referendum.image?.proposer?.toString() ?? '-',
      link: '#',
    },
    status: 'active',
    votes: referendum.votes,
    description: PAData?.content ?? "-",
    isPassing: referendum.isPassing,
    threshold: threshold,
    quiz: latestQuiz,
    submissions: allSubmissions
  }
}

/**
 * Return a dependent query, that depends on the ksmAdress (user) and the fetched referendums
 * @param {*} referendumId
 * @returns Promise
 */
export function useAccountVote( referendumId ) {
  const connectedAccountIndex = useAppStore( (state) => state.user.connectedAccount )
  const ksmAddress = useAppStore( (state) => state.user.connectedAccounts?.[connectedAccountIndex]?.ksmAddress )
  const { data:referendums } = useReferendums()
  return useQuery( ['userVote', ksmAddress, referendumId ], async () => {
    const referendum = referendums.find( ( ref ) => ref.id === referendumId )
    const userVote = referendum && referendum?.votes?.find((vote) => {
      return vote.accountId.toString() === ksmAddress;
    })
    return userVote ? parseCastVote( userVote ) : false
  }, {
    enabled: !!referendums
  })
}

/**
 * Return a dependent query, that depends on the ksmAdress (user) and the fetched referendums
 * @param {*} referendumId
 * @returns Promise
 */
 export function useAccountVotePast( referendumId ) {
  const connectedAccountIndex = useAppStore( (state) => state.user.connectedAccount )
  const ksmAddress = useAppStore( (state) => state.user.connectedAccounts?.[connectedAccountIndex]?.ksmAddress )
  const { data:referendums } = usePastReferendums()
  return useQuery( ['userVote', ksmAddress, referendumId ], async () => {
    const referendum = referendums.find( ( ref ) => ref.index === referendumId )
    return referendum
    // const userVote = referendum && referendum?.votes?.find((vote) => {
    //   return vote.accountId.toString() === ksmAddress;
    // })
    // return userVote
  }, {
    enabled: !!referendums
  })
}

export const testReferendumFetcher = async () => {
  return new Promise( async ( resolve ) => {
    const client = new ApolloClient({
      uri: websiteConfig.proofofchaos_graphql_endpoint,
      cache: new InMemoryCache(),
    })

    let result = await client.query({
      query: QUERY_REFERENDUMS,
      variables: {
        "where": {
          "endedAt_isNull": true
        },
        "orderBy": "index_DESC",
      }
    })

    resolve( result )
  })
}

export const useReferendums = () => {
  return useQuery( ['activeReferendums'], activeReferendumFetcher )
}



export const usePastReferendums = ( ) => {
  return useQuery(
    [ "pastReferendumData" ],
    async () => {
      return pastReferendumFetcher()
    },
  )
};