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
        ; FIXME get :use to import everything.
        ))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; pages
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; forms
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; create new project:


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; rm;

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; settings;




;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; inits;


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; jqt
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;





;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; init
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;


($ #(do
      (db-init)
      ;(nuke-db)
      (trigger-new-page "projects" nil)))


; DEBUG:
; #(js/console.log %)
;
; TODO:
; - v2: multiple people add finance to same projects
; - consolidate page drawing function; show-cost/proj/costs are too similar.
; - add phonegap for contacts.
; - add back/forward browser integration
; - logs on error sql
; - add ryanday.net [trend.]builtwith.com blog.jqtouch rss
