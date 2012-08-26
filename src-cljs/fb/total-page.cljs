(ns fb.total
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


;; show total
(defn show-total [e origa]
  (load-template "total")
  (let [pid           (.data origa "pid")
        ul            ($ "#newpage div.total div ul")
        li            ($ "<li></li>")
        title         ($ "#newpage h2 div.title")
        set-total-data (fn [id name tot tx]
                        (do-buddies (fn [tx r]
                                      (let [nbb     (.-length (.-rows r))
                                            av      (/ tot nbb)
                                            abs     #(if (< 0 %) % (- %))
                                            buds    (for [b (row-seq r)]
                                                      [(abs (- av (.-btot b))) (.-btot b) (.-bname b)])
                                            divbuds (group-by #(> av (second %)) buds)
                                            maxpaid (apply max (map #(second %) buds))
                                            cmp     #(< (.-btot %1) (.-btot %2))
                                            bgive   (sort cmp (divbuds true))
                                            btake   (sort cmp (divbuds false))
                                            owes    (loop [[tdif ttot tname :as t] (first btake) ts (next btake)
                                                           [gdif gtot gname :as g] (first bgive) gs (next bgive)
                                                           ac []]
                                                      (if (and g t)
                                                        (if (> tdif gdif)
                                                          (recur [(- tdif gdif) ttot tname] ts
                                                                 (first gs) (next gs)
                                                                 (conj ac [gname tname gdif]))
                                                          (recur (first ts) (next ts)
                                                                 [(- gdif tdif) gtot gname] gs
                                                                 (conj ac [gname tname tdif])))
                                                        ac))]
                                        (-> title
                                          (.append "Total: ")
                                          (.append (money tot))
                                          (.append " Average: ")
                                          (.append (money av)))
                                        (doseq [[d t n] buds]
                                          (.append ul (-> li
                                                        (.clone)
                                                        (.append (buddy n))
                                                        (.append " paid: ")
                                                        (.append (money t))
                                                        (.append (if (> t av)
                                                                   " needs: "
                                                                   " owes: "))
                                                        (.append (money d))
                                                        (set-tot-rect-back maxpaid av t))))
                                        (doseq [[gn tn tot] owes]
                                          (.append ul (-> li
                                                        (.clone)
                                                        (.append (buddy gn))
                                                        (.append " owes ")
                                                        (.append (money tot))
                                                        (.append " to ")
                                                        (.append (buddy tn)))))
                                        (when (zero? nbb)
                                          (.remove ul))))
                                    pid)
                         (swap-page e origa))]
    (set-title-project set-total-data pid)))

(add-page-init! "total" show-total)
