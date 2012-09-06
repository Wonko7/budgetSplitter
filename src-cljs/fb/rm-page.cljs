(ns fb.rm
  (:use [fb.jq :only [$ clj->js]]
        [fb.sql :only [do-proj do-buddies do-row row-seq do-cost do-costs do-buddy do-settings
                       update-settings up-cost up-buddy
                       db-init add-cost add-buddy add-proj
                       nuke-db rm-proj rm-cost rm-buddy]]
        [fb.vis :only [set-title-project set-rect-back set-tot-rect-back money buddy]]
        [fb.misc :only [mk-settings add-data trim num]]
        [fb.pages :only [add-page-init! load-template swap-page trigger-new-page]]
        [fb.back :only [rm-from-back!]]
        ; FIXME get :use to import everything.
        ))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; rm;

(defn show-rm [e origa]
  (load-template "rm")
  (let [pid     (.data origa "pid")
        cid     (.data origa "cid")
        bid     (.data origa "bid")
        rmtype  (.data origa "rm")
        title   ($ "#newpage div.rm div.toolbar h1")
        menu    ($ "#newpage div.rm div.toolbar")
        ul      ($ "#newpage div.rm ul")
        li      ($ "<li></li>")
        a       ($ "<a></a>")
        rm-proj-page (fn [e]
                       (rm-from-back! "pid" pid)
                       (rm-proj #(trigger-new-page "projects" {"projects" [["anim" "pop"]]}) pid)
                       false)
        rm-cost-page (fn [e]
                       (rm-from-back! "cid" cid)
                       (rm-cost #(trigger-new-page "proj" {"proj" [["pid" pid] ["anim" "pop"]]}) cid)
                       false)
        rm-budd-page (fn [e]
                       (rm-from-back! "bid" bid)
                       (rm-buddy #(trigger-new-page "buddies" {"buddies" [["bid" bid] ["pid" pid] ["anim" "pop"]]}) bid)
                       false)
        set-rm-budd  (fn [t r]
                       (let [i   (.item (.-rows r) 0)
                             tot     (reduce + (map #(.-btot %) (row-seq r)))]
                         (-> ul
                           (.append (-> li
                                      (.clone)
                                      (.append (str "Delete buddy " (.-bname i) "?"))))
                           (.append (-> li
                                      (.clone)
                                      (.append (str "Total contribution: "))
                                      (.append (money tot))))
                           (.append (-> li
                                      (.clone)
                                      (.addClass "rmli")
                                      (.append (-> a
                                                 (.clone)
                                                 (.text "Delete")
                                                 (.attr "href" "null")
                                                 (.data "bid" bid)
                                                 (.on "click"
                                                      rm-budd-page)))))))
                       (swap-page e origa))
        set-rm-cost  (fn [t r]
                       (let [i (.item (.-rows r) 0)]
                         (-> ul
                           (.append (-> li
                                      (.clone)
                                      (.append (str "Delete Expense " (.-cname i) "?"))))
                           (.append (-> li
                                      (.clone)
                                      (.append (str "Total: "))
                                      (.append (money (.-ctot i)))))
                           (.append (-> li
                                      (.clone)
                                      (.addClass "rmli")
                                      (.append (-> a
                                                 (.clone)
                                                 (.text "Delete")
                                                 (.attr "href" "null")
                                                 (.data "cid" (.-id i))
                                                 (.on "click"
                                                      rm-cost-page)))))))
                       (swap-page e origa))
        set-rm-proj  (fn [t r]
                       (let [i (.item (.-rows r) 0)]
                         (-> ul
                           (.append (-> li
                                      (.clone)
                                      (.text (str "Delete project " (.-name i) "?"))))
                           (.append (-> li
                                      (.clone)
                                      (.addClass "rmli")
                                      (.append (-> a
                                                 (.clone)
                                                 (.text "Delete")
                                                 (.attr "href" "null")
                                                 (.data "pid" (.-id i))
                                                 (.on "click"
                                                      rm-proj-page)))))))
                       (swap-page e origa))]
    (.append menu (-> a
                    (.clone)
                    (.addClass "button")
                    (.addClass "back")
                    (.attr "href" "back")
                    (.text "Cancel")))
    (condp = rmtype
      "cost"  (do-cost  set-rm-cost cid)
      "buddy" (do-buddy set-rm-budd bid)
      "proj"  (do-proj  set-rm-proj pid))))

(add-page-init! "rm" show-rm)
