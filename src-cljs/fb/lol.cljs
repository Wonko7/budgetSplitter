(ns fb.lol
  (:use [fb.pages :only [trigger-new-page]]
        [fb.init :only [add-init! do-inits]]
        ; FIXME get :use to import everything.
        ))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; init
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;


(add-init! #(trigger-new-page "projects" nil) :last)
(do-inits)


; DEBUG:
; #(js/console.log %)
;
; TODO:
; - now:
;   - important:
;     - add phonegap for contacts.                                  -> william
;     - try zepto instead of jquery, benchmark.
;     - remove row-seq and extend js row obj instead.               -> william
;     - cljs advanced optimisation for compiling                    -> william... fuuuuuuuuuuuuu
;                                                                      compiles (takes a few hours) but doesn't work. see optim_ext branch.
;     - use swipe/dclick events?                                    -> cyrille
;     - fix jqtouch init with icon, loading splash screen & toolbar
;       style
;
;   - misc:
;     - add back/forward browser integration?
;     - fix gestion des animations
;     - better sql (remove costs.total, add views and shit?)        -> cyrille
;     - logs on sql error
;     - make a quick project/todo organiser app for internal usage? -> cyrille
;
;   - UI: better compass themes:
;     - simple white with blue borders.
;
;   - Tests:
;     - test with empty db, empty entries
;     - try going back until back stack is empty.
;     - think about automating tests... simulate clicks and keyboard entry, check for correct sql data?
;
; - v2:
;   - multiple people add finance to same projects (node.js)
;   - choose to opt in or out of certain expenses -> cigarettes
;
; - add ryanday.net [trend.]builtwith.com blog.jqtouch rss
