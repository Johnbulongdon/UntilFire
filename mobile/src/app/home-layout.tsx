import { Redirect } from 'expo-router'

/** Old links return to the fixed Home screen; layout editing has been retired. */
export default function HomeLayout() {
  return <Redirect href="/" />
}
