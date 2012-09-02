(ns fb.total
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]
        [fb.sql :only [do-proj do-buddies do-row row-seq do-cost do-costs do-buddy do-settings do-total
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
                        (do-total (fn [buddies]
                                      (let [abs     #(if (< 0 %) % (- %))
                                            buds    (for [b buddies
                                                          :let [av (reduce #(+ %1 (/ (:ctot %2) (:nbbuds %2))) 0 (:costs b))]]
                                                      (into b {:avg av :delta (abs (- (:btot b) av))}))
                                            divbuds (group-by #(> (:avg %) (:btot %)) buds)
                                            maxpaid (apply max (map #(:btot %) buds))
                                            cmp     #(< (:btot %1) (:btot %2))
                                            bgive   (sort cmp (divbuds true))
                                            btake   (sort cmp (divbuds false))
                                            updif   #(into %1 {:delta %2})
                                            owes    (loop [{tdelta :delta ttot :btot :as t} (first btake) ts (next btake)
                                                           {gdelta :delta gtot :btot :as g} (first bgive) gs (next bgive)
                                                           ac []]
                                                      (if (and g t)
                                                        (if (> tdelta gdelta)
                                                          (recur (updif t (- tdelta gdelta)) ts
                                                                 (first gs) (next gs)
                                                                 (conj ac [g t gdelta]))
                                                          (recur (first ts) (next ts)
                                                                 (updif g (- gdelta tdelta)) gs
                                                                 (if (pos? tdelta)
                                                                   (conj ac [g t tdelta])
                                                                   ac)))
                                                        ac))]
                                        (-> title
                                          (.append "Total: ")
                                          (.append (money tot)) ;; FIXME better title?
                                          ;(.append " Average: ")
                                          ;(.append (money av))
                                          )
                                        (doseq [{n :bname t :btot a :avg d :delta} buds]
                                          (.append ul (-> li
                                                        (.clone)
                                                        (.append (buddy n))
                                                        (.append " paid: ")
                                                        (.append (money t))
                                                        (.append (if (> t a)
                                                                   " needs: "
                                                                   " owes: "))
                                                        (.append (money d))
                                                        (set-tot-rect-back maxpaid a t))))
                                        (.append ul (-> li
                                                      (.clone)
                                                      (.addClass "sepli")
                                                      (.text "Solution:")))
                                        (doseq [[gn tn tot] owes]
                                          (.append ul (-> li
                                                        (.clone)
                                                        (.append (buddy (:bname gn)))
                                                        (.append " owes ")
                                                        (.append (money tot))
                                                        (.append " to ")
                                                        (.append (buddy (:bname tn))))))
                                        (when (zero? (count buds))
                                          (.remove ul))))
                                    pid)
                         (swap-page e origa))]
    (set-title-project set-total-data pid)))

(add-page-init! "total" show-total)
