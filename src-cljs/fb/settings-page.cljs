(ns fb.settings
  (:use [fb.jq :only [$ clj->js]]
        [fb.sql :only [do-proj do-buddies do-row row-seq do-cost do-costs do-buddy do-settings
                       update-settings up-cost up-buddy
                       db-init add-cost add-buddy add-proj
                       nuke-db rm-proj rm-cost rm-buddy]]
        [fb.vis :only [set-title-project set-rect-back set-tot-rect-back money buddy set-theme give-input-focus]]
        [fb.misc :only [mk-settings add-data trim num]]
        [fb.pages :only [add-page-init! load-template swap-page trigger-new-page]]
        [fb.init :only [add-init!]]
        ; FIXME get :use to import everything.
        ))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; settings;

(defn show-settings [e origa]
  (load-template "settings")
  (let [pid     (.data origa "pid")
        menu    ($ "#newpage div.settings .toolbar")
        ulPos   ($ "#newpage div.settings ul.menuPos")
        ulTheme ($ "#newpage div.settings ul.theme")
        ulHelp  ($ "#newpage div.settings ul.help")
        ulOptin ($ "#newpage div.settings ul.optin")
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
                                        (.attr "name" grp)))
                             (give-input-focus :li :radio))))
        update  (fn [e]
                  (do-settings (fn [settings]
                                 (let [settings {:menuOn  (:menuOn settings)
                                                 :menuPos (condp = (.data ($ "#content input[name=\"menuPos\"]:checked") "type")
                                                            "top"    :top
                                                            "bottom" :bottom)
                                                 :optIn   (= "optin" (.data ($ "#content input[name=\"optIn\"]:checked") "type"))
                                                 :help    (.attr ($ "#content input[name=\"help\"]") "checked")
                                                 :theme   (.data ($ "#content input[name=\"theme\"]:checked") "theme")}]
                                   (update-settings settings
                                                    #(do
                                                       (set-theme settings)
                                                       (trigger-new-page "back" nil)
                                                       false)))))
                  false)
        set-settings (fn [settings]
                       (-> ulOptin
                         (.append (-> li
                                    (.clone)
                                    (.addClass "sepli")
                                    (.text "Add Expense Behaviour:")))
                         (.append (add-inp li "radio" "Opt In by default"  "optIn" (:optIn settings)       {"inp" [["type" "optin"]]}))
                         (.append (add-inp li "radio" "Opt Out by default" "optIn" (not (:optIn settings)) {"inp" [["type" "optout"]]})))
                       (-> ulPos
                         (.append (-> li
                                    (.clone)
                                    (.addClass "sepli")
                                    (.text "Menu Placement:")))
                         (.append (add-inp li "radio" "Top"    "menuPos" (= :top    (:menuPos settings)) {"inp" [["type" "top"]]}))
                         (.append (add-inp li "radio" "Bottom" "menuPos" (= :bottom (:menuPos settings)) {"inp" [["type" "bottom"]]})))
                       (-> ulHelp
                         (.append (-> li
                                    (.clone)
                                    (.addClass "sepli")
                                    (.text "Help/Info:")))
                         (.append (add-inp li "checkbox" "Display Help" "help" (:help settings) {"inp" [["type" "help"]]})))
                       (-> ulTheme
                         (.append (-> li
                                    (.clone)
                                    (.addClass "sepli")
                                    (.text "Theme:")))
                         (.append (add-inp li "radio" "Grey"  "theme" (= "jqtouch-edited" (:theme settings)) {"inp" [["theme" "jqtouch-edited"]]}))
                         (.append (add-inp li "radio" "Blue"  "theme" (= "blue"           (:theme settings)) {"inp" [["theme" "blue"]]}))
                         (.append (add-inp li "radio" "Green" "theme" (= "green"          (:theme settings)) {"inp" [["theme" "green"]]}))
                         (.append (add-inp li "radio" "Red"   "theme" (= "red"            (:theme settings)) {"inp" [["theme" "red"]]})))
                       (-> liApply
                         (.addClass "addli")
                         (.append (-> a
                                    (.clone)
                                    (.attr "href" "back")
                                    (.text "Apply")
                                    (.on "click" update))))
                       (.submit ($ "#newpage div.settings form") update)
                       (swap-page e origa))]
    (.append menu (-> a
                    (.clone)
                    (.addClass "back")
                    (.attr "href" "back")
                    (.text "Back")))
    (do-settings set-settings)))

(add-page-init! "settings" show-settings)
(add-init! #(do-settings set-theme))
