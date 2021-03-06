(ns fb.cost
  (:use [fb.jq :only [$ clj->js]]
        [fb.sql :only [do-proj do-buddies do-row row-seq do-cost do-costs do-buddy do-settings
                       update-settings up-cost up-buddy
                       db-init add-cost add-buddy add-proj
                       nuke-db rm-proj rm-cost rm-buddy]]
        [fb.vis :only [set-title-project set-rect-back set-tot-rect-back money buddy give-input-focus]]
        [fb.misc :only [mk-settings add-data trim num]]
        [fb.pages :only [add-page-init! load-template swap-page trigger-new-page]]
        ; FIXME get :use to import everything.
        ))


;; show a cost detail: buddies
(defn show-cost [e origa]
  (load-template "cost")
  (let [pid           (.data origa "pid")
        cid           (.data origa "cid")
        ul            ($ "#newpage div.cost div ul")
        ti            ($ "#newpage div.cost div.title")
        li            ($ "<li></li>")
        a             ($ "<a></a>")
        set-cost-data (fn [id name tot tx settings]
                        (do-cost (fn [tx r]
                                   (let [i        (.item (.-rows r) 0)
                                         buds     (for [b (row-seq r)]
                                                    [(.-bname b) (.-btot b) (.-ctot b)])
                                         maxpaid  (apply max (map #(nth % 1) buds))]
                                     (-> ti
                                       (.append (str (.-cname i) ": "))
                                       (.append (money (.-ctot i))))
                                     (.append ul (-> li
                                                   (.clone)
                                                   (.addClass "addli")
                                                   (.append (-> a
                                                              (.clone)
                                                              (.text "Edit")
                                                              (.data "pid" pid)
                                                              (.data "cid" cid)
                                                              (.attr "href" "newcost")))))
                                     (doseq [[name btot ctot] buds]
                                       (.append ul (-> li
                                                     (.clone)
                                                     (.append (buddy name))
                                                     (.append ": ")
                                                     (.append (money btot))
                                                     (.data "cid" cid)
                                                     (.data "pid" pid)
                                                     (set-rect-back maxpaid btot))))
                                     (.append ul (-> li
                                                   (.clone)
                                                   (.addClass "rmli")
                                                   (.append (-> a
                                                              (.clone)
                                                              (.text "Delete Expense")
                                                              (.data "pid" pid)
                                                              (.data "cid" cid)
                                                              (.data "rm" "cost")
                                                              ;(.data "anim" "pop")
                                                              (.attr "href" "rm")))))))
                                 cid)
                        (swap-page e origa))]
    (set-title-project set-cost-data pid)))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; new-cost

(defn add-page-cost []
  (let [i     ($ "#content div.newcost form [name=\"name\"]")
        name  (.val i)
        pid   (.data i "pid")
        cid   (.data i "cid")
        costs (for [i ($ "#content div.newcost form div.buddieslist [name=\"tot\"]")
                    :let [e ($ i) rid (.data e "rid") bid (.data e "bid")
                          o? (.attr (.find (.parent e) "input[name=\"optin\"]")
                                    "checked")]]
                {:rid rid :bid bid :o? o? :tot (num (.val e))})
        total (reduce #(+ %1 (if (:o? %2) (:tot %2) 0)) 0 costs)
        done  #(trigger-new-page "proj" {"proj" [["pid" pid]]})]
    (if (<= (count name) 0) ;; FIXME with contracts, also better notifs.
      (js/alert "Invalid name")
      (if (<= total 0)
        (js/alert "No money")
        (if cid
          (up-cost cid name
                   (filter #(and (zero? (:rid %)) (:o? %)) costs)           ; New relation
                   (filter #(and (pos?  (:rid %)) (:o? %)) costs)           ; Update rel
                   (filter #(and (pos?  (:rid %)) (not (:o? %))) costs)     ; rm rel
                   pid total done)
          (add-cost name
                   (filter #(:o? %) costs)
                    pid total done))))
    false))

(defn show-new-cost [e origa]
  (load-template "newcost")
  (let [pid     (.data origa "pid")
        cid     (.data origa "cid") ;; If cid is set, this is an update, not a new cost.
        inp     ($ "#newpage div.newcost form [name=\"name\"]")
        ul      ($ "#newpage div.newcost form div.buddieslist ul")
        label   ($ "<label></label>")
        li      ($ "<li></li>")
        div     ($ "<span></span>")
        binput  ($ "<input type=\"number\" step=\"any\" min=\"0\" class=\"numbers\" name=\"tot\" />")
        cinput  (.attr ($ "<input type=\"checkbox\" name=\"optin\" />")
                       "tabindex" 1000) ;; FIXME; html hack to remove checkbox from tab list
        optinfo (.hide ($ "<span class=\"optout\"> has opted out of this expense.</span>"))
        ;; validate input & set title:
        validate        (fn [e]
                          (let [total ($ "#content div.newcost .costtotal")
                                alli  ($ "#content div.newcost form div.buddieslist [name=\"tot\"]")
                                name  (.val ($ "#content div.newcost form [name=\"name\"]"))
                                addb  ($ "#content div.newcost form div.buddieslist ul li.addli")
                                tot   (reduce + 0 (for [i alli
                                                        :let [i ($ i)]
                                                        :when (.is i ":visible")]
                                                    (num (.val i))))]
                            (.html total (money tot))
                            (if (or (<= tot 0) (<= (count name) 0))
                              (.hide addb)
                              (.show addb))))
        ;; opt out:
        opt-vis         (fn [li c?]
                          (let [ninp ($ (.find li "input[name=\"tot\"]"))
                                info ($ (.find li "span.optout"))
                                bud  ($ (.find li "span.buddy"))]
                            (if c?
                              (do
                                (.removeClass bud "unselected")
                                (.hide info)
                                (.show ninp))
                              (do
                                (.addClass bud "unselected")
                                (.show info)
                                (.hide ninp)))
                            (validate nil)))
        opt-toggle      (fn [src child]
                          (.on src
                               "click" ;; FIXME wtf
                               (fn [e]
                                 (let [li   (.parents ($ (.-currentTarget e)) "li")
                                       cinp (.find li "input[name=\"optin\"]")
                                       c?   (not (.attr cinp "checked"))]
                                   (.attr cinp "checked" c?)
                                   (opt-vis li c?)
                                   true))))
        opt-set         (fn [li settings]
                          (let [cinp ($ (.find li "input[name=\"optin\"]"))
                                rid  (.data cinp "rid")
                                c?   (if cid (pos? rid) (:optIn settings))]
                            (.attr cinp "checked" c?)
                            (opt-vis li c?)
                            li))
        ;; set page data:
        set-buddy-data  (fn [id name tot tx settings]
                          (-> inp
                            (.keyup validate)
                            (.data "cid" cid)
                            (.data "pid" pid)
                            (give-input-focus))
                          (do-buddies (fn [tx r]
                                        (if (> (.-length (.-rows r)) 0)
                                          (let [buds (if cid
                                                       (for [b (row-seq r)]
                                                         [(.-bname b) (.-id b) (.-btot b) (.-rid b)])
                                                       (for [b (row-seq r)]
                                                         [(.-bname b) (.-id b) 0 nil]))]
                                            (doseq [[bname bid btot rid] buds]
                                              (-> ul
                                                (.append (-> li
                                                           (.clone)
                                                           (.append (-> div
                                                                      (.clone)
                                                                      (.append (-> cinput
                                                                                 (.clone)
                                                                                 (.data "bid" bid)
                                                                                 (.data "rid" rid)
                                                                                 (opt-toggle :current)))
                                                                      (.append " ")
                                                                      (.append (-> label
                                                                                 (.clone)
                                                                                 (.append (buddy bname))
                                                                                 (.append ":")))
                                                                      (.append (.clone optinfo))
                                                                      (opt-toggle "input[name=\"optin\"]")))
                                                           (.append (-> binput
                                                                      (.clone)
                                                                      (.data "pid" pid)
                                                                      (.data "bid" bid)
                                                                      (.data "rid" rid)
                                                                      (.attr "placeholder" (str bname " paid..."))
                                                                      (#(if (zero? btot) % (.val % btot)))
                                                                      (.keyup validate)))
                                                           (opt-set settings)
                                                           (give-input-focus :li)))))
                                            (when cid
                                              (.val inp (.-cname (.item (.-rows r) 0))))
                                            (.append ul (-> li
                                                          (.clone)
                                                          (.addClass "addli")
                                                          (.hide)
                                                          (.append (-> ($ "<a></a>")
                                                                     (.text "Add")
                                                                     (.attr "href" "null")
                                                                     (.on "click" add-page-cost))))))
                                          (.append ul (-> li
                                                        (.clone)
                                                        (.append (-> ($ "<a></a>")
                                                                   (.attr "href" "buddies")
                                                                   (.data "pid" pid)
                                                                   (.text "Add buddies first!")))))))
                                      pid cid)
                          (.submit ($ "#newpage div.newcost form") add-page-cost)
                          (.on ($ "#newpage") "pageAnimationEnd" #(.trigger inp "keyup"))
                          (swap-page e origa)
                          (.focus ($ "#content div.newcost form [name=\"name\"]")))]
    (set-title-project set-buddy-data pid)))


(add-page-init! "cost" show-cost)
(add-page-init! "newcost" show-new-cost)
