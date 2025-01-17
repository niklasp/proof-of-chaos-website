import Layout from '../layouts/layout'
import { useConfig } from '../hooks/use-config';
import { VictoryPie } from 'victory';
import { Checkbox,
  createTheme,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Slider,
  ThemeProvider
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useUserVotes } from '../hooks/use-votes';
import { useUserDistributions } from '../hooks/use-distributions';
import { current } from 'tailwindcss/colors';
import { getLuckMultiplier, lucksForConfig, microToKSM } from '../utils';
import { isEqual } from 'lodash';
import Button from '../components/ui/button';
import ConfigTable from '../components/ui/ConfigTable'
import Loader from '../components/ui/loader';

const theme = createTheme({
  typography: {
    fontFamily: [
      'Ubuntu Mono',
      'monospace'
    ].join(','),
  },
})

function Test() {
  const { data: refConfig, isLoading: isRefConfigLoading } = useConfig( 229 )
  const { data: userDistributions, isLoading: isUserDistributionLoading } = useUserDistributions( 229 )

  const userDistribution = userDistributions?.[0]

  const [ values, setValues ] = useState({
    ksm: 5,
    dragon: {
      babyEquipped: false,
      toddlerEquipped: false,
      adolescentEquipped: false,
      adultEquipped: false,
    },
    quizCorrect: false,
  })

  const resetToUserVote = () => {
    setValues( {
      ksm: microToKSM( userDistribution?.amountConsidered ),
      dragon: {
        ...dragonEquippedStringToBools( userDistribution?.dragonEquipped )
      }
    })
  }

  const dragonEquippedStringToBools = ( equippedString ) => {
    let dragonBools = {
      babyEquipped: false,
      toddlerEquipped: false,
      adolescentEquipped: false,
      adultEquipped: false,
    }

    switch ( equippedString ) {
      case "Adult":
        dragonBools.adultEquipped = true;
        break;
      case "Adolescent":
        dragonBools.adolescentEquipped = true;
        break;
      case "Toddler":
        dragonBools.toddlerEquipped = true;
        break;
      case "Baby":
        dragonBools.babyEquipped = true;
        break;
      default:
    }
    return dragonBools
  }

  const isWalletSettingsShowing =
    values.ksm === microToKSM( userDistribution?.amountConsidered ) &&
    isEqual( values.dragon, dragonEquippedStringToBools( userDistribution?.dragonEquipped ) )

  useEffect(() => {
    const dragonBools = dragonEquippedStringToBools( userDistribution?.dragonEquipped )
    setValues({
      ...values,
      dragon: {
        ...dragonBools,
      },
      ksm: microToKSM( userDistribution?.amountConsidered ),
    })
  }, [ userDistribution ])


  if ( isRefConfigLoading || isUserDistributionLoading ) {
    return <Loader />
  }

  const currentLuckMultiplier = getLuckMultiplier( values.dragon, refConfig )
  const lucks = lucksForConfig( values.ksm, refConfig, currentLuckMultiplier )
  const chartData = [
    { x: `common\n${ parseFloat(lucks['common']).toFixed(2) }%`, y: lucks['common'] },
    { x: `rare\n${ parseFloat(lucks['rare']).toFixed(2) }%`, y: lucks['rare'] },
    { x: `epic\n${ parseFloat(lucks['epic']).toFixed(2) }%`, y: lucks['epic'] },
  ]

  const handleCheckBoxChange = ( e ) => {
    const clickedDragonBonus = [
      'babyEquipped',
      'toddlerEquipped',
      'adolescentEquipped',
      'adultEquipped'
    ].includes(e.target.name)
    setValues({
      ...values,
      dragon: {
        ...values.dragon,
        babyEquipped: clickedDragonBonus ? false : values.dragon.babyEquipped,
        toddlerEquipped: clickedDragonBonus ? false : values.dragon.toddlerEquipped,
        adolescentEquipped: clickedDragonBonus ? false : values.dragon.adolescentEquipped,
        adultEquipped: clickedDragonBonus ? false : values.dragon.adultEquipped,
        [e.target.name]: e.target.checked,
      },
    });
  }

  const handleSliderChange = ( e ) => {
    const voteAmountWithConviction = parseInt( e.target.value )
    setValues( {
      ...values,
      ksm: voteAmountWithConviction,
    } )
  }

  const sliderValue = values.ksm

  const marks = userDistribution ? [
    {
      value: 0,
      label: '0',
    },
    {
      value: microToKSM( userDistribution.amountConsidered ),
      label: 'Your Vote',
    },
    {
      value: refConfig?.maxValue,
      label: `${ refConfig?.maxValue } KSM`,
    },
  ] : [
    {
      value: 0,
      label: '0',
    },
    {
      value: refConfig?.maxValue,
      label: `${ refConfig?.maxValue } KSM`,
    },
  ]

  return (
    <>
      <div className="w-full flex justify-center">
        <div className="max-w-2xl mx-10 chart-wrapper">
          <VictoryPie
            padAngle={2}
            data={ chartData }
            colorScale={["lavender", "turquoise", "gold", "cyan" ]}
            className="overflow-visible px-10"
            innerRadius={60}
            labelRadius={({ radius }) => radius - 70 }
            style={{ labels: { fontSize: 18 }, overflow: 'visible' }}
          />
        </div>
        <div className="flex flex-col">
          <ThemeProvider theme={ theme }>
            <FormControl sx={{ m: 3 }} component="fieldset" variant="standard">
              <FormLabel component="legend">Wallet Properties when voting / sendout</FormLabel>
              <FormGroup>
                {/* <FormControlLabel
                  control={
                    <Checkbox 
                      checked={ values.quizCorrect }
                      onChange={handleCheckBoxChange}
                      name="quizCorrect"
                    />
                  }
                  label="Quiz Answered Correctly"
                /> */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={ values.dragon.babyEquipped }
                      onChange={handleCheckBoxChange}
                      name="babyEquipped"
                    />
                  }
                  label="Baby Dragon Equipped"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={ values.dragon.toddlerEquipped }
                      onChange={handleCheckBoxChange}
                      name="toddlerEquipped"
                    />
                  }
                  label="Toddler Dragon Equipped"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={ values.dragon.adolescentEquipped }
                      onChange={handleCheckBoxChange}
                      name="adolescentEquipped"
                    />
                  }
                  label="Adolescent Dragon Equipped"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={ values.dragon.adultEquipped }
                      onChange={handleCheckBoxChange}
                      name="adultEquipped"
                    />
                  }
                  label="Adult Dragon Equipped"
                />
                <FormHelperText>Your Luck Multiplier is: { currentLuckMultiplier }</FormHelperText>
                <div className="pt-5">
                  Vote Amount With Conviction
                  <Slider
                    min={ 0 }
                    max={ refConfig?.maxValue ? refConfig.maxValue + 10 : 50 }
                    marks={ marks }
                    value={ sliderValue }
                    step={ 0.1 }
                    aria-label="Default"
                    valueLabelDisplay="auto"
                    onChange={ handleSliderChange }
                  />
                </div>
              </FormGroup>
              <FormHelperText>See how the luck distribution differs for different values</FormHelperText>
              <Button
                onClick={ resetToUserVote }
                variant={ isWalletSettingsShowing ? 'disabled' : 'calm' }
                size={ 'small' }
                className={ 'mt-2' }
                disabled={ isWalletSettingsShowing ? true : false }
              >
                Reset to your considered values
              </Button>
            </FormControl>
          </ThemeProvider>
        </div>
      </div>
      <div>
      <h3 className="text-xl mb-4">Config for sendout</h3>
        <ConfigTable json={ refConfig } />
      </div>
    </>
  )
}

Test.getLayout = function getLayout(page){
  return <Layout>{page}</Layout>
}

export default Test
