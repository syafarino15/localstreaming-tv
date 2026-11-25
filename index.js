// Expo entry point. The app uses an explicit screen state machine instead of a
// navigation library so D-Pad focus stays deterministic on Android TV.
import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);
