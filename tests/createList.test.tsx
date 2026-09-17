/// <reference path="../node_modules/expo-router/types/expect.d.ts" />
import { Text } from "react-native";
import { Stack, router } from "expo-router";
import type { Href } from "expo-router";
import {
  renderRouter,
  screen,
  act,
  fireEvent,
  waitFor,
} from "expo-router/testing-library";
import { NativeStackView } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { dialogScreenOptions, stackScreenOptions } from "@/constants/navigation";
import CreateList from "@/app/create-list";
import Index from "@/app/index";
import TabsLayout from "@/app/(tabs)/_layout";
import * as ListsLayout from "@/app/(tabs)/lists/_layout";
import * as SettingsLayout from "@/app/(tabs)/settings/_layout";
import type { ListSummary } from "@/types/lists";

jest.mock("@/services/lists");
const lists = jest.requireMock("@/services/lists");

const created: ListSummary = {
  id: 7,
  name: "Verbs",
  type: "custom",
  jlptLevel: null,
  starred: false,
  itemCount: 0,
  lastActivity: "2024-01-01T00:00:00.000Z",
};

const Screen = () => <Text>screen</Text>;

/**
 * The dialog and the layouts are the real files, so the router state under
 * test is the one the app builds; every leaf is a stub. The Stack's children
 * must match `app/_layout.tsx` exactly: listed screens come first in the route
 * order, and the first route is where a cold start lands.
 */
function RootLayout() {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create-list" options={dialogScreenOptions} />
      </Stack>
    </SafeAreaProvider>
  );
}

const routes = {
  _layout: RootLayout,
  index: Index,
  "(tabs)/_layout": TabsLayout,
  "(tabs)/dictionary/index": Screen,
  "(tabs)/lists/_layout": ListsLayout,
  "(tabs)/lists/index": Screen,
  "(tabs)/lists/[id]": Screen,
  "(tabs)/settings/_layout": SettingsLayout,
  "(tabs)/settings/index": Screen,
  "(tabs)/study/index": Screen,
  "word/[id]": Screen,
  "create-list": CreateList,
};

const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const push = (href: Href) => act(() => router.push(href));

function typeAndCreate(name: string) {
  fireEvent.changeText(screen.getByPlaceholderText("List name"), name);
  fireEvent.press(screen.getByText("Create"));
}

beforeEach(() => {
  jest.clearAllMocks();
  lists.createList.mockResolvedValue(created);
  lists.addToList.mockResolvedValue(undefined);
});

describe("create list", () => {
  // With no launch URL — an Android dev client — React Navigation boots on the
  // root stack's first route, and listing a screen as a Stack child moves it
  // to the front. Registering the dialog must not make it the boot screen.
  it("is not where the app opens", () => {
    open("/lists");
    const root = screen.UNSAFE_getAllByType(NativeStackView)[0];
    expect(root.props.state.routeNames[0]).toBe("index");
  });

  it("floats over the current screen as a transparent modal", () => {
    open("/lists");
    push("/create-list");

    const root = screen.UNSAFE_getAllByType(NativeStackView)[0];
    const { descriptors, state } = root.props;
    const { options } = descriptors[state.routes[state.index].key];
    expect(options.presentation).toBe("transparentModal");
  });

  it("opens the new list after creating it from the Lists screen", async () => {
    open("/lists");
    push("/create-list");
    typeAndCreate("Verbs");

    await waitFor(() => expect(screen).toHavePathname("/lists/7"));
    expect(lists.createList).toHaveBeenCalledWith("Verbs");
    expect(lists.addToList).not.toHaveBeenCalled();
  });

  // Closing the dialog and opening the list used to be two calls; the second
  // ran before the first had applied, so the list was pushed inside a second
  // copy of the tabs. Back then fell to that copy's first tab, the dictionary.
  it("opens the new list inside the Lists tab, so back returns to Lists", async () => {
    const app = open("/lists");
    push("/create-list");
    typeAndCreate("Verbs");
    await waitFor(() => expect(screen).toHavePathname("/lists/7"));

    const rootStack = app.getRouterState()?.routes[0].state;
    expect(rootStack?.routes.map((r) => r.name)).toEqual(["(tabs)"]);

    act(() => router.back());
    expect(screen).toHavePathname("/lists");
  });

  it("adds the word it was opened with and returns to that page", async () => {
    open("/word/1");
    push({ pathname: "/create-list", params: { entryId: "1", word: "食べる" } });
    typeAndCreate("Verbs");

    await waitFor(() => expect(lists.addToList).toHaveBeenCalledWith(7, 1));
    await waitFor(() => expect(screen).toHavePathname("/word/1"));
  });

  it("returns to where it came from on cancel", () => {
    open("/lists");
    push("/create-list");
    fireEvent.press(screen.getByText("Cancel"));
    expect(screen).toHavePathname("/lists");
  });

  it("stays open when creating fails, so the name can be retried", async () => {
    lists.createList.mockResolvedValue(null);
    open("/lists");
    push("/create-list");
    typeAndCreate("Verbs");

    await waitFor(() => expect(lists.createList).toHaveBeenCalled());
    expect(screen).toHavePathname("/create-list");
    expect(screen.getByPlaceholderText("List name")).toBeTruthy();
  });
});
