(ns fb.proj
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]
        [fb.sql :only [do-proj do-buddies do-row row-seq do-cost do-costs do-buddy do-settings
                       update-settings up-cost up-buddy
                       db-init add-cost add-buddy add-proj
                       nuke-db rm-proj rm-cost rm-buddy]]
        [fb.vis :only [set-title-project set-rect-back set-tot-rect-back money buddy mk-validate give-input-focus]]
        [fb.misc :only [mk-settings add-data trim num]]
        [fb.pages :only [add-page-init! load-template swap-page trigger-new-page]]
        ; FIXME get :use to import everything.
        ))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; create new project:

(defn add-page-project []
  (let [name (.val ($ "#content div.new form [name=\"name\"]"))
        addp (fn [tx r]
               (trigger-new-page "proj" {"proj" [["pid" (.-insertId r)]]}))]
    ; FIXME make contracts
    (if (<= (count name) 0)
      (js/alert "Invalid name")
      (add-proj name addp)))
  false)

(defn show-new-form [e origa]
  (load-template "new")
  (let [addb    "#newpage div.new form ul li a"
        inp      ($ "#newpage div.new form [name=\"name\"]") ]
    (-> inp
      (.keyup (mk-validate addb))
      (.focus)
      (give-input-focus))
    (.submit ($ "#newpage div.new form") add-page-project)
    (.bind ($ addb) "click touchend" add-page-project)
    (swap-page e origa)
    (.focus ($ "#content div.new form [name=\"name\"]"))))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; show all projects:

(defn show-projects [e a]
  (load-template "projects")
  (let [li ($ "<li></li>")
        ul (.append ($ "#newpage div ul")
                    (-> li
                      (.clone)
                      (.addClass "addli")
                      (.append (-> ($ "<a></a>")
                                 (.text "New Project")
                                 (.attr "href" "new")))))]
    (do-proj (fn [t r]
               (do-row (fn [i]
                         (.append ul (-> li
                                       (.clone)
                                       (.addClass "arrow")
                                       (.append (-> ($ "<a></a>")
                                                  (.text (.-name i))
                                                  (.attr "href" "proj")
                                                  (.data "pid" (.-id i))))
                                       ;(.append (.addClass ($ "<small>42</small>") "counter"))
                                       )))
                       r)
               (swap-page e a)))))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; show a project and its costs:

(defn show-proj [e origa]
  (load-template "proj")
  (let [pid     (.data origa "pid")
        li      ($ "<li></li>")
        a       ($ "<a></a>")
        ul      (.append ($ "#newpage div.proj ul")
                         (-> li
                           (.clone)
                           (.addClass "addli")
                           (.append (-> ($ "<a></a>")
                                      (.text "Add Expense")
                                      (.data "pid" pid)
                                      (.attr "href" "newcost")))))
        set-proj-data (fn [id name tot tx settings]
                        (.data ($ "#newpage div.proj div.menu a") "pid" pid)
                        (do-costs (fn [tx r]
                                    (let [costs   (for [c (row-seq r)]
                                                    [(.-id c) (.-name c) (.-tot c)])
                                          maxpaid (apply max (map #(nth % 2) costs))]
                                      (doseq [[cid name tot] costs]
                                        (.append ul (-> li
                                                      (.clone)
                                                      (.addClass "arrow")
                                                      (set-rect-back maxpaid tot)
                                                      (.append (-> a
                                                                 (.clone)
                                                                 (.text (str name ": " ))
                                                                 (.append (money tot))
                                                                 (.data "cid" cid)
                                                                 (.data "pid" pid)
                                                                 (.attr "href" "cost"))))))
                                      (.append ul (-> li
                                                    (.clone)
                                                    (.addClass "rmli")
                                                    (.append (-> a
                                                               (.clone)
                                                               (.text "Delete Project")
                                                               (.data "pid" pid)
                                                               (.data "rm" "proj")
                                                               (.data "anim" "pop")
                                                               (.attr "href" "rm")))))))
                                  pid)
                        (swap-page e origa))]
    (set-title-project set-proj-data pid)))

(add-page-init! "projects" show-projects)
(add-page-init! "new" show-new-form)
(add-page-init! "proj" show-proj)
