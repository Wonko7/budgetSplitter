(ns fb.buddies
  (:use [fb.jq :only [$ clj->js]]
        [fb.sql :only [do-proj do-buddies do-row row-seq do-cost do-costs do-buddy do-settings
                       update-settings up-cost up-buddy
                       db-init add-cost add-buddy add-proj
                       nuke-db rm-proj rm-cost rm-buddy]]
        [fb.vis :only [set-title-project set-rect-back set-tot-rect-back money buddy mk-validate give-input-focus]]
        [fb.misc :only [mk-settings add-data trim num]]
        [fb.pages :only [add-page-init! load-template swap-page trigger-new-page]]
        ; FIXME get :use to import everything.
        ))


(defn show-buddy [e origa]
  (load-template "indivbuddy")
  (let [pid           (.data origa "pid")
        bid           (.data origa "bid")
        ul            ($ "#newpage div.indivbuddy div.list ul")
        title         ($ "#newpage div.indivbuddy h2 div.title")
        li            ($ "<li></li>")
        a             ($ "<a></a>")
        ;; name edition:
        validate      (mk-validate "#newpage div.indivbuddy div.editname li.addli")
        update-name   (fn [e]
                       (let [v    (.val ($ "#content div.indivbuddy div.editname input"))
                             done (fn [e]
                                    (do-buddy #(do
                                                 (.text ($ "#content div.indivbuddy span.buddy")
                                                        (.-bname (.item (.-rows %2) 0)))
                                                 ;; hide edit box:
                                                 (.trigger ($ "#content div.indivbuddy div.list li.editnamebuttonid a") "click"))
                                              bid))]
                         (if (zero? (count v))
                           (js/alert "Empty name")
                           (up-buddy bid v "img" done)))
                        false)
        edit-name     (fn [e]
                        (let [a       ($ (first ($ (.-currentTarget e))))
                              editdiv ($ "#content div.indivbuddy div.editname")]
                        (if (.is editdiv ":visible")
                          (do
                            (.hide editdiv)
                            (-> (.parent (.text a "Edit Name"))
                              (.removeClass "rmli")
                              (.addClass "addli")))
                          (do
                            (.show editdiv)
                            (-> (.parent (.text a  "Cancel Edit Name"))
                              (.removeClass "addli")
                              (.addClass "rmli"))
                            (.focus (.find editdiv "input:first"))
                            (.hide ($ "#content div.indivbuddy div.editname li.addli")))))
                        false)
        set-edit      (fn [bname]
                        (let [div  (.hide ($ "#newpage div.indivbuddy div.editname"))
                              inp  (.val ($ "#newpage div.indivbuddy div.editname input") bname)]
                          (.hide ($ "#newpage div.indivbuddy div.editname"))
                          (.on ($ "#newpage div.indivbuddy div.editname li.addli a") "click" update-name)
                          (.submit ($ "#newpage div.indivbuddy div.editname form") update-name)
                          (-> inp
                            (.keyup validate)
                            (give-input-focus))
                          (.append ul (-> li
                                        (.clone)
                                        (.addClass "addli")
                                        (.addClass "editnamebuttonid")
                                        (.append (-> a
                                                   (.clone)
                                                   (.text "Edit name")
                                                   (.data "pid" pid)
                                                   (.data "bid" bid)
                                                   (.attr "href" "null")
                                                   (.on "click" edit-name)))))))
        ;; set page data:
        set-budd-data (fn [id name tot tx settings]
                        (do-buddy (fn [tx r]
                                    (let [i       (.item (.-rows r) 0)
                                          nbc     (.-length (.-rows r))
                                          costs   (for [c (row-seq r)]
                                                    [(.-cname c) (.-ctot c) (.-btot c)])
                                          tot     (reduce + (map #(nth % 2) costs))
                                          maxpaid (apply max (map #(nth % 2) costs))
                                          bname   (buddy (.-bname i))]
                                      (-> title
                                        (.append (.clone bname))
                                        (.append "'s total contribution: ")
                                        (.append (money tot)))
                                      (set-edit (.-bname i))
                                      (when (< 0 tot)
                                        (doseq [[cname ctot btot] costs]
                                          (.append ul (-> li
                                                        (.clone)
                                                        (.append cname)
                                                        (.append ": ")
                                                        (.append (.clone bname))
                                                        (.append " paid ")
                                                        (.append (money btot))
                                                        (.append " of ")
                                                        (.append (money ctot))
                                                        (set-rect-back maxpaid btot)))))
                                      (.append ul (-> li
                                                    (.clone)
                                                    (.addClass "rmli")
                                                    (.append (-> a
                                                               (.clone)
                                                               (.text "Delete Buddy")
                                                               (.data "pid" pid)
                                                               (.data "bid" bid)
                                                               (.data "rm" "buddy")
                                                               (.data "anim" "pop")
                                                               (.attr "href" "rm"))))))
                                    (swap-page e origa))
                                  bid))]
    (set-title-project set-budd-data pid)))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; show buddies & add form

(defn append-buddy [ul li pid bid name maxpaid btot]
  (.append ul (-> li
                (.clone)
                (.addClass "arrow")
                (.append (-> ($ "<a></a>")
                           (.append (buddy name))
                           (.append ": ")
                           (.append (money btot))
                           (.attr "href" "indivbuddy")
                           (.data "bid" bid)
                           (.data "pid" pid)))
                (set-rect-back maxpaid btot))))

(defn add-page-buddy []
  (let [i    ($ "#content div.buddies form [name=\"name\"]")
        name (.val i)
        pid  (.data i "pid")
        addb (fn [tx r]
               (let [ul      (.show ($ "#content div.buddies form div.list ul")) ;; only hidden when zero buddies
                     li      ($ "<li></li>")
                     inp     ($ "#content div.buddies form [name=\"name\"]")]
                 (.val inp "")
                 (append-buddy ul li pid (.-insertId r) (trim name) 100 0)))]
    (.hide ($ "#content div.buddies form ul li.addli"))
    (if (<= (count name) 0)
      (js/alert "Invalid name")
      (add-buddy pid name "img" addb)))
  false)

(defn show-buddies [e origa]
  (load-template "buddies")
  (let [pid      (.data origa "pid")
        inp      ($ "#newpage div.buddies form [name=\"name\"]")
        ul       ($ "#newpage div.buddies form div.list ul")
        li       ($ "<li></li>")
        add      "#newpage div.buddies form ul li.addli"
        validate (mk-validate add)
        set-buddy-data  (fn [id name tot tx settings]
                          (-> inp
                            (.keyup validate)
                            (.data "pid" pid)
                            (give-input-focus))
                          (.submit ($ "#newpage div.buddies form") add-page-buddy)
                          (.on ($ add) "click" add-page-buddy)
                          (do-buddies (fn [tx r]
                                        (let [buds (for [b (row-seq r)]
                                                     [(.-id b) (.-bname b) (.-btot b)])
                                              maxpaid (apply max (map #(nth % 2) buds))]
                                          (doseq [[id bname btot] buds]
                                            (append-buddy ul li pid id bname maxpaid btot))
                                          (when (zero? (count buds))
                                            (.hide ul))))
                                      pid)
                          (swap-page e origa))]
    (set-title-project set-buddy-data pid)))


(add-page-init! "indivbuddy" show-buddy)
(add-page-init! "buddies" show-buddies)
