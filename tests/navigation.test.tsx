/// <reference path="../node_modules/expo-router/types/expect.d.ts" />
import { Text, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import type { Href } from "expo-router";
import { renderRouter, screen, act, fireEvent } from "expo-router/testing-library";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import type { NavigationState, PartialState } from "@react-navigation/native";
import TabsLayout from "@/app/(tabs)/_layout";
import * as DictionaryLayout from "@/app/(tabs)/dictionary/_layout";
import * as ListsLayout from "@/app/(tabs)/lists/_layout";
import * as StudyLayout from "@/app/(tabs)/study/_layout";
import Index from "@/app/index";

/**
 * The real screens hit SQLite, so every leaf is a stub. The layouts are the
 * real files: the router state under test is the one the app actually builds.
 * Lives outside `app/` because Expo Router would otherwise serve it as a route.
 */
const Screen = () => <Text>screen</Text>;

// A 3-button Android bar reports ~48dp; the S25 Ultra is the reporting device.
const insets = { top: 0, left: 0, right: 0, bottom: 48 };

function RootLayout() {
  return (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 400, height: 800 }, insets }}
    >
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}

const routes = {
  _layout: RootLayout,
  index: Index,
  "(tabs)/_layout": TabsLayout,
  "(tabs)/dictionary/_layout": DictionaryLayout,
  "(tabs)/dictionary/index": Screen,
  "(tabs)/lists/_layout": ListsLayout,
  "(tabs)/lists/index": Screen,
  "(tabs)/lists/[id]": Screen,
  "(tabs)/lists/jlpt": Screen,
  "(tabs)/study/_layout": StudyLayout,
  "(tabs)/study/index": Screen,
  "(tabs)/study/session": Screen,
  "(tabs)/settings/index": Screen,
  "word/[id]": Screen,
  "kanji/[char]": Screen,
};

type State = NavigationState | PartialState<NavigationState>;
type Route = State["routes"][number];

const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const push = (href: string) => act(() => router.push(href as Href));
const back = () => act(() => router.back());

/** Depth-first search of the router state for the first route with `name`. */
function findRoute(state: State | undefined, name: string): Route | undefined {
  for (const route of state?.routes ?? []) {
    if (route.name === name) return route;
    const nested = findRoute(route.state, name);
    if (nested) return nested;
  }
  return undefined;
}

function routeKey(app: ReturnType<typeof open>, name: string) {
  const route = findRoute(app.getRouterState(), name);
  if (!route) throw new Error(`?? route ${name} is not in the router state`);
  return route.key;
}

describe("navigation", () => {
  it("opens the dictionary from the root redirect", () => {
    open("/");
    expect(screen).toHavePathname("/dictionary");
  });

  it("returns from a list to the lists screen", () => {
    open("/lists");
    push("/lists/5");
    expect(screen).toHavePathname("/lists/5");
    back();
    expect(screen).toHavePathname("/lists");
  });

  it("returns from JLPT to the lists screen", () => {
    open("/lists");
    push("/lists/jlpt");
    back();
    expect(screen).toHavePathname("/lists");
  });

  it("returns from a word to the dictionary", () => {
    open("/dictionary");
    push("/word/1");
    expect(screen).toHavePathname("/word/1");
    back();
    expect(screen).toHavePathname("/dictionary");
  });

  it("returns from a word to the list it was opened from", () => {
    open("/lists");
    push("/lists/5");
    push("/word/1");
    back();
    expect(screen).toHavePathname("/lists/5");
  });

  it("returns from a kanji to the word it was opened from", () => {
    open("/word/1");
    push("/kanji/日");
    expect(screen).toHavePathname("/kanji/日");
    back();
    expect(screen).toHavePathname("/word/1");
  });

  // B12 and B10 both come from one screen instance surviving between visits.
  it("mounts a fresh list screen on every visit", () => {
    const app = open("/lists");
    push("/lists/5");
    const first = routeKey(app, "[id]");
    back();
    push("/lists/6");
    expect(routeKey(app, "[id]")).not.toBe(first);
  });

  it("mounts a fresh kanji screen when the same kanji is reopened", () => {
    const app = open("/word/1");
    push("/kanji/日");
    const first = routeKey(app, "kanji/[char]");
    back();
    push("/kanji/日");
    expect(routeKey(app, "kanji/[char]")).not.toBe(first);
  });

  // The tab button has no href, so a press is a plain tab jump: it must
  // neither reset the lists stack nor pile a second index onto it.
  it("keeps the lists stack as it was when its tab is pressed", () => {
    const app = open("/lists");
    push("/lists/5");
    const listsStack = () =>
      findRoute(app.getRouterState(), "lists")?.state?.routes.map((r) => r.name);

    fireEvent.press(screen.getByText("Lists"));
    expect(screen).toHavePathname("/lists/5");
    expect(listsStack()).toEqual(["index", "[id]"]);

    fireEvent.press(screen.getByText("Dictionary"));
    expect(screen).toHavePathname("/dictionary");
    fireEvent.press(screen.getByText("Lists"));
    expect(screen).toHavePathname("/lists/5");
    expect(listsStack()).toEqual(["index", "[id]"]);
  });
});

describe("tab bar", () => {
  it("clears the system bar by 8 and sizes from its content", () => {
    open("/dictionary");
    const { descriptors, state } = screen.UNSAFE_getByType(BottomTabBar).props;
    const style = StyleSheet.flatten(descriptors[state.routes[0].key].options.tabBarStyle);
    expect(style.paddingBottom).toBe(insets.bottom + 8);
    expect(style.height).toBeUndefined();
  });
});
