// path: src/theme/baiLightTheme.ts

import { MD3LightTheme } from "react-native-paper";
import { baiRadius } from "./baiRadius";

export const baiLightTheme = {
	...MD3LightTheme,
	roundness: baiRadius.md,
	colors: {
		...MD3LightTheme.colors,
	},
	components: {
		Button: {
			style: { borderRadius: baiRadius.md },
		},
		TextInput: {
			style: { borderRadius: baiRadius.md },
		},
		Card: {
			style: { borderRadius: baiRadius.xl },
		},
	},
};
