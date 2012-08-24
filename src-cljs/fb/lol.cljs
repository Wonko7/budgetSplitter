(ns fb.lol
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]
        [fb.sql :only [do-proj do-buddies do-row row-seq do-cost do-costs do-buddy do-settings
                       update-settings up-cost up-buddy
                       db-init add-cost add-buddy add-proj
                       nuke-db rm-proj rm-cost rm-buddy]]
        [fb.vis :only [set-title-project set-rect-back set-tot-rect-back money buddy]]
        [fb.misc :only [mk-settings add-data trim num]]
        [fb.pages :only [add-page-init! load-template swap-page trigger-new-page]]
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
;     - cljs advanced optimisation for compiling
;     - trigger focus on edit?                                      -> william
;     - use swipe/dclick events?                                    -> cyrille
;
;   - misc:
;     - add back/forward browser integration?
;     - better sql (remove costs.total, add views and shit?)        -> cyrille
;     - logs on sql error
;     - make a quick project/todo organiser app for internal usage? -> cyrille
;
;   - UI: better compass themes:
;     - simple white with blue borders.
;     - fetch Canvas colors from theme.css:               DONE! now needs gradient as background.
;                                                               fetch gradients from css then draw.
;                                                                  -> william
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
