import { atom, useAtom } from 'jotai';
import { MenuId } from '@/components/screens/title-screen/menu-definitions';

const promotionDismissedAtom = atom(false);
const titleMenuAtom = atom<MenuId>(MenuId.Main);

export function useSteamPromotionDismissed() {
	return useAtom(promotionDismissedAtom);
}

export function useTitleMenu() {
	return useAtom(titleMenuAtom);
}
