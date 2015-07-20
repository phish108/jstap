# jstap - a mobile friendly gesture handling API

jstap provides a gesture abstraction for Android an iOS touch APIs.
It handles the slight differences between the two systems and abstracts
highlevel gestures.

jstap supports the the following gestures.

* tap
* long tap
* double tap
* twin tap (2 finger tap)
* long twin tap
* double twin tap
* pinch
   * pinch widen (in-gesture event)
   * pinch narrow (in-gesture event)
* stretch
* grab (multi finger pinch)
* swipe
* flick (fast swipe)
* start touch
* during/move touch
* end touch

jstap manages the ingesture handling for complex gestures. This allows
application writers to listen to the intended gesture without dealing
with the complexity of gesture detection.

jstap is based on the jester API but has been completely rewritten for speed
and functionality. For most of the API jstap is compatible with jester, but
it extends the gestures API. Given that jstap should be only used on
contemporary mobile devices, it uses the web-view native CustomEvent API.
