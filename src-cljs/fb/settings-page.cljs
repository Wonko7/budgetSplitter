(ns fb.settings
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


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; settings;

(defn show-settings [e origa]
  (load-template "settings")
  (let [pid     (.data origa "pid")
        menu    ($ "#newpage div.settings .toolbar")
        ulPos   ($ "#newpage div.settings ul.menuPos")
        ulHelp  ($ "#newpage div.settings ul.help")
        liApply ($ "#newpage div.settings ul.apply li")
        li      ($ "<li></li>")
        a       ($ "<a></a>")
        inp     ($ "<input />")
        add-inp (fn [li type title grp check? data]
                  (.append (-> li
                             (.clone)
                             (.append (-> inp
                                        (.clone)
                                        (add-data "inp" data)
                                        (.attr "checked" check?)
                                        (.attr "title" title)
                                        (.attr "value" title)
                                        (.attr "type" type)
                                        (.attr "name" grp))))))
        update  (fn [e]
                  (do-settings (fn [settings]
                                 (let [menuPos (condp = (.val ($ "#content input[name=\"menuPos\"]:checked"))
                                                 "Top"    :top
                                                 "Bottom" :bottom)
                                       help    (.attr ($ "#content input[name=\"help\"]") "checked")]
                                   (update-settings {:menuOn  (:menuOn settings)
                                                     :menuPos menuPos
                                                     :help    help}
                                                    #(do
                                                       (trigger-new-page "back" nil)
                                                       false)))))
                  false)
        set-settings (fn [settings]
                       (-> ulPos
                         (.append (-> li
                                    (.clone)
                                    (.text "Menu Placement:")))
                         (.append (add-inp li "radio" "Top"    "menuPos" (= :top (:menuPos settings))    {"inp" [["type" "top"]]}))
                         (.append (add-inp li "radio" "Bottom" "menuPos" (= :bottom (:menuPos settings)) {"inp" [["type" "bottom"]]})))
                       (-> ulHelp
                         (.append (add-inp li "checkbox" "Display Help" "help" (:help settings) {"inp" [["type" "help"]]})))
                       (-> liApply
                         (.addClass "addli")
                         (.append (-> a
                                    (.clone)
                                    (.attr "href" "back")
                                    (.text "Apply")
                                    (.bind "click touchend" update))))
                       (.submit ($ "#newpage div.settings form") update)
                       (swap-page e origa))]
    (.append menu (-> a
                    (.clone)
                    (.addClass "back")
                    (.attr "href" "back")
                    (.text "Back")))
    (do-settings set-settings)))

(add-page-init! "settings" show-settings)