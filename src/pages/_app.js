import Head from 'next/head';
import { ThemeProvider } from 'next-themes';
import '../../styles/globals.scss'
import '@talisman-connect/components/talisman-connect-components.esm.css';
import '@talisman-connect/ui/talisman-connect-ui.esm.css';
import ModalsContainer from '../components/modals/container';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DrawersContainer from '../components/drawer/container';
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { websiteConfig } from '../data/website-config';


import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { NextSeo } from 'next-seo';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ✅ globally default to 20 seconds
      staleTime: 1000 * 30,
    },
  },
})

function MyApp({ Component, pageProps }) {
  const getLayout = Component.getLayout ?? ((page) => page)
  
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1 maximum-scale=1"
        />
        <title>Proof of Chaos — Free NFTs for Voting on Kusama</title>
        <meta name="title" content="Proof of Chaos — Free NFTs for Voting on Kusama" />
        <meta name="description" content="Each time a wallet votes on a Referendum, a new Item is airdropped to its wallet, free, tradable, collectable." />
        <meta name="keywords" content="Governance, Kusama, NFT" />

        <meta property="og:type" content="website"/>
        <meta property="og:url" content="https://proofofchaos.com/"/>
        <meta property="og:title" content="Proof of Chaos — Free NFTs for Voting on Kusama"/>
        <meta property="og:description" content="Each time a wallet votes on a Referendum, a new Item is airdropped to its wallet, free, tradable, collectable."/>
        <meta property="og:image" content="https://proofofchaos.com/public/proof-of-chaos.png"/>

        <meta property="twitter:card" content="summary_large_image"/>
        <meta property="twitter:url" content="https://proofofchaos.com/"/>
        <meta property="twitter:title" content="Proof of Chaos — Free NFTs for Voting on Kusama"/>
        <meta property="twitter:description" content="Each time a wallet votes on a Referendum, a new Item is airdropped to its wallet, free, tradable, collectable."/>
        <meta property="twitter:image" content="https://proofofchaos.com/public/proof-of-chaos.png"/>

      </Head>
      <QueryClientProvider client={queryClient}>
        {getLayout(<Component {...pageProps} />)}
        <DrawersContainer />
        <ModalsContainer />
        <ToastContainer />
        {/* <ReactQueryDevtools initialIsOpen /> */}
      </QueryClientProvider>
    </>
  )
}

export default MyApp
