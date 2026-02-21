// BizAssist_mobile
// path: src/features/units/CreateUnitList.tsx
//
// Create Unit list (catalog)
// - COUNT category included and shown first
// - Maintains insertion order within each category

import React, { useMemo, useState } from "react";
import { Pressable, SectionList, Text, View } from "react-native";
import { TextInput } from "react-native-paper";

import { styles } from "./CreateUnitList.styles";
import { UNIT_CATALOG, UnitCategory, UnitItem } from "./unitCatalog";
import { FIELD_LIMITS } from "@/shared/fieldLimits";

type Section = {
	title: UnitCategory;
	data: UnitItem[];
};

type CreateUnitListProps = {
	onSelectUnit?: (unit: UnitItem) => void;
	onCreateCustomUnit?: () => void;
};

// Governance: COUNT first (then keep screenshot-matching order for the rest)
const CATEGORY_ORDER: UnitCategory[] = ["COUNT", "AREA", "TIME", "WEIGHT", "VOLUME", "LENGTH"];

export function CreateUnitList({ onSelectUnit, onCreateCustomUnit }: CreateUnitListProps) {
	const [query, setQuery] = useState("");

	const sections = useMemo<Section[]>(() => {
		const q = query.trim().toLowerCase();

		// Maintain catalog insertion order (critical to match screenshots)
		const filtered = q ? UNIT_CATALOG.filter((u) => u.name.toLowerCase().includes(q)) : UNIT_CATALOG;

		const grouped: Record<UnitCategory, UnitItem[]> = {
			COUNT: [],
			LENGTH: [],
			AREA: [],
			VOLUME: [],
			WEIGHT: [],
			TIME: [],
		};

		for (const unit of filtered) grouped[unit.category].push(unit);

		return CATEGORY_ORDER.map((cat) => ({ title: cat, data: grouped[cat] })).filter((s) => s.data.length > 0);
	}, [query]);

	return (
		<View style={styles.container}>
			<View style={styles.searchWrap}>
				<TextInput
					mode='flat'
					placeholder='Search Units'
					value={query}
					onChangeText={(v) => setQuery(v.length > FIELD_LIMITS.search ? v.slice(0, FIELD_LIMITS.search) : v)}
					style={styles.search}
					left={<TextInput.Icon icon='magnify' />}
					underlineColor='transparent'
					activeUnderlineColor='transparent'
					maxLength={FIELD_LIMITS.search}
				/>
			</View>

			<SectionList
				sections={sections}
				keyExtractor={(item) => item.id}
				stickySectionHeadersEnabled={false}
				keyboardShouldPersistTaps='handled'
				contentContainerStyle={styles.listContent}
				renderSectionHeader={({ section }) => (
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>{section.title}</Text>
						<View style={styles.sectionDivider} />
					</View>
				)}
				renderItem={({ item }) => (
					<View>
						<Pressable
							onPress={() => onSelectUnit?.(item)}
							style={({ pressed }) => [styles.row, pressed ? { opacity: 0.6 } : null]}
						>
							<Text style={styles.rowText}>{item.name}</Text>
						</Pressable>
						<View style={styles.rowDivider} />
					</View>
				)}
			/>

			<Pressable onPress={onCreateCustomUnit} style={styles.bottomBar}>
				<Text style={styles.bottomBarText}>Create Custom Unit</Text>
			</Pressable>
		</View>
	);
}
