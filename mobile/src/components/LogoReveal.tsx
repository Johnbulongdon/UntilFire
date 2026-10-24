import LottieView from 'lottie-react-native'
import { View } from 'react-native'

/** The animated UntilFire wordmark from the website (public/logo/untilfire-logo-reveal.json). */
export function LogoReveal({ width = 300 }: { width?: number }) {
  return (
    <View style={{ width, height: width * 0.36 }}>
      <LottieView
        source={require('../../assets/lottie/logo-reveal.json')}
        autoPlay
        loop={false}
        resizeMode="contain"
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  )
}
