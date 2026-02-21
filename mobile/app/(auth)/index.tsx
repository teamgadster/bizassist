// path: app/(auth)/index.tsx
import { useWindowDimensions } from "react-native";
import AuthCoverPhone from "./index.phone";
import AuthCoverTablet from "./index.tablet";



const TABLET_BREAKPOINT = 768;

export default function AuthCoverIndex() {
	const { width } = useWindowDimensions();
	const isTablet = width >= TABLET_BREAKPOINT;

	return isTablet ? <AuthCoverTablet /> : <AuthCoverPhone />;
}
