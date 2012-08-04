(ns fb.lol
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]
        [fb.sql :only [nuke-db do-proj do-buddies do-row do-cost do-costs add-cost add-buddy add-proj add-db! db-init]]
        [fb.vis :only [set-title-project set-rect-back]]
        ; FIXME get :use to import everything.
        ))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; page loading
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(def page-dyn-inits {})

(defn add-init! [name func]
  (def page-dyn-inits (into page-dyn-inits {name func})))

(defn load-template [name]
  (let [temp ($ (str "div.hidden div." name))
        temp (if (zero? (.-length temp)) ($ "div.hidden div.404") temp)
        body ($ "#top")
        newp (.hide ($ "<div id=\"newpage\"></div>"))]
    (.html (.append body (.append newp (.clone temp))))))

(defn swap-page []
  (let [newp ($ "#newpage")
        cont ($ "#content")
        hidd ($ "body div.hidden")]
    (.hide cont 300 #(do
                       (.remove cont)
                       (.show (.attr newp "id" "content"))))))

(defn load-dyn-page [name e]
   (if-let [f (page-dyn-inits name)]
     (f e)
     (do
       (load-template name)
       (swap-page))))

; FIXME add this to an init function
($ #(delegate ($ "body") "a" "click touchend"
              (fn [e] 
                (let [a    ($ (.-currentTarget e))
                      link (.attr a "href")]
                  (load-dyn-page link e)
                  false)))) 


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; pages
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; show all projects
(defn show-projects []
  (load-template "projects")
  (let [ul ($ "#newpage div ul")
        li ($ "#newpage div ul li")]
    (do-proj (fn [t r]
               (do-row (fn [i]
                         (.append ul (-> li 
                                       (.clone) 
                                       (.empty) 
                                       (.append (-> ($ "<a></a>")
                                                  (.text (.-name i))
                                                  (.attr "href" "proj")
                                                  (.data "pid" (.-id i)))))))
                       r)
               (swap-page)))))

;; show a project and its costs
(defn show-proj [e]
  (load-template "proj")
  (let [a       ($ (first ($ (.-currentTarget e))))
        pid     (.data a "pid")
        ul      ($ "#newpage div.proj div ul")
        li      ($ "<li></li>")
        a       ($ "<a></a>")
        set-proj-data (fn [id name tot tx]
                        (.data ($ "#newpage div.proj div.menu a") "pid" pid)
                        (do-costs (fn [tx r]
                                    (do-row #(let [a  (-> a
                                                        (.clone)
                                                        (.text (.-name %))
                                                        (.data "cid" (.-id %))
                                                        (.data "pid" pid)
                                                        (.attr "href" "cost"))
                                                   li (-> li
                                                        (.clone)
                                                        (.append a)
                                                        (.append (str " : $" (.-tot %)))
                                                        (set-rect-back tot (.-tot %)))]
                                               (.append ul li))
                                            r))
                                  pid)
                        (swap-page))]
    (set-title-project set-proj-data pid)))

;; show a cost detail: buddies
(defn show-cost [e]
  (load-template "cost")
  (let [a             ($ (first ($ (.-currentTarget e))))
        pid           (.data a "pid")
        cid           (.data a "cid")
        ul            ($ "#newpage div.cost div ul")
        li            ($ "<li></li>")
        a             ($ "<a></a>")
        set-cost-data (fn [id name tot tx]
                        ;; FIXME should other buddies be shown? $0?
                        (do-cost (fn [tx r]
                                   (do-row #(let [a   (-> a
                                                        (.clone)
                                                        (.text (str (.-bname %) ": $" (.-btot %)))
                                                        (.data "cid" cid)
                                                        (.data "pid" pid))
                                                  li  (-> li
                                                        (.clone)
                                                        (.append a)
                                                        (set-rect-back (.-ctot %) (.-btot %)))]
                                              (.append ul li))
                                           r)
                                   (swap-page))
                                 cid))]
    (set-title-project set-cost-data pid)))

(add-init! "projects" show-projects)
(add-init! "proj" show-proj)
(add-init! "cost" show-cost)


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; forms
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; trigger a click to load new page
(defn trigger-new-page [href data]
  (-> ($ "<a></a>")
    (.hide)
    (.attr "href" href)
    (#(reduce (fn [a [k v]] (.data a k v)) %1 data))
    (.appendTo ($ "#content"))
    (.click)))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; create new project:

(defn add-page-project []
  (let [name (.val ($ "#top div.new form [name=\"name\"]"))
        addp (fn [tx r]
               (trigger-new-page "proj" [["pid" (.-insertId r)]]))]
    ; FIXME make contracts
    (if (<= (count name) 0)
      (js/alert "Invalid name")
      (add-proj name addp))) 
  false)

(defn show-new-form []
  (load-template "new")
  (.submit ($ "#newpage div.new form") add-page-project)
  (swap-page))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; show buddies & add form

(defn append-buddy [ul li pid bid name ptot btot]
  (.append ul (-> li
                (.clone)
                (.text (str name ": $" btot))
                (.data "bid" bid)
                (.data "pid" pid)
                (set-rect-back ptot btot))))

(defn add-page-buddy []
  (let [i    ($ "#top div.buddies form [name=\"name\"]")
        name (.val i)
        pid  (.data i "pid")
        addb (fn [tx r]
               (let [ul      ($ "#content div.buddies form div.list ul")
                     li      ($ "<li></li>")
                     inp     ($ "#content div.buddies form [name=\"name\"]")]
                 (.val inp "")
                 (append-buddy ul li pid (.-insertId r) name 100 0)))]
    (if (<= (count name) 0)
      (js/alert "Invalid name")
      (add-buddy pid name "img" addb)))
  false)

(defn show-buddies [e]
  (load-template "buddies")
  (let [a       ($ (first ($ (.-currentTarget e))))
        pid     (.data a "pid")
        inp     ($ "#newpage div.buddies form [name=\"name\"]")
        ul      ($ "#newpage div.buddies form div.list ul")
        li      ($ "<li></li>")
        set-buddy-data  (fn [id name tot tx]
                          (.data inp "pid" pid)
                          (.submit ($ "#newpage div.buddies form") add-page-buddy)
                          (do-buddies (fn [tx r]
                                        (do-row #(append-buddy ul li pid (.-id %) (.-name %) (.-ptot %) (.-btot %))
                                                r))
                                      pid)
                          (swap-page))]
    (set-title-project set-buddy-data pid)))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; new-cost

(defn add-page-cost []
  (let [i     ($ "#content div.newcost form [name=\"name\"]")
        name  (.val i)
        pid   (.data i "pid")
        alli  ($ "#content div.newcost form div.buddies [name=\"tot\"]") 
        total (reduce + (for [i alli]
                          (int (.val ($ i)))))
        done  #(trigger-new-page "proj" [["pid" pid]])]
    (if (<= (count name) 0)
      (js/alert "Invalid name")
      (if (<= total 0)
        (js/alert "No cost")
        (add-cost name (for [i alli :let [e ($ i)] :when (> (count (.val e)) 0)]
                         [(int (.data e "bid")) (int (.val e))])
                  pid total done)))
    false))

(defn show-new-cost [e]
  (load-template "newcost")
  (let [a       ($ (first ($ (.-currentTarget e))))
        pid     (.data a "pid")
        inp     ($ "#newpage div.newcost form [name=\"name\"]")
        cont    ($ "#newpage div.newcost form div.buddies")
        row     ($ "<div class=\"hrow\"></div>")
        bname   ($ "<div class=\"cleft\"></div>")
        bnum    ($ "<div class=\"cright\"></div>")
        binput  ($ "<input type=\"text\" class=\"numbers\" name=\"tot\" />")
        validate        (fn [e]
                          (let [inp  ($ (.-currentTarget e))
                                v     (.val inp)
                                total ($ "#content div.newcost form .costtotal")
                                alli  ($ "#content div.newcost form div.buddies [name=\"tot\"]")]
                            (.val inp (.replace v #"^[^0-9]*([0-9]+\.?[0-9]*)?.*$" "$1"))
                            (.text total (reduce + (for [i alli]
                                                     (int (.val ($ i))))))))
        set-buddy-data  (fn [id name tot tx]
                          (.data inp "pid" pid)
                          (.submit ($ "#newpage div.newcost form") add-page-cost)
                          (do-buddies (fn [tx r]
                                        (do-row #(-> cont
                                                   (.append (-> row
                                                              (.clone)
                                                              (.append (-> bname
                                                                         (.clone)
                                                                         (.text (.-name %)))) 
                                                              (.append (-> bnum
                                                                         (.clone)
                                                                         (.append (-> binput
                                                                                    (.clone)
                                                                                    (.data "pid" pid)
                                                                                    (.data "bid" (.-id %))
                                                                                    (.keyup validate))))))))
                                                r))
                                      pid)
                          (swap-page))] 
    (set-title-project set-buddy-data pid)))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; inits;

(add-init! "buddies" show-buddies)
(add-init! "new" show-new-form)
(add-init! "newcost" show-new-cost)


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; init
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

($ #(do
      (db-init)
      ;(nuke-db)
      ;(add-proj "Mars!!!")
      ;(add-buddy 1 "harry" "img")
      ;(add-buddy 1 "jack" "img")
      ;(add-buddy 1 "john" "img")
      ;(add-buddy 1 "dalek" "img")
      ;(add-cost "firefly" [[1 100] [2 25] [3 125] [4 50]] 1 400)
      ;(add-cost "daban urnud" [[1 100] [2 25] [3 225] [4 50]] 1 400)
      ;(.hide ($ "#hidden"))
      (load-dyn-page "projects" nil)))


; DEBUG:
; #(js/console.log %)
;
; TODO:
; - v2: multiple people add finance to same projects
; - consolidate page drawing function; show-cost/proj/costs are too similar.
; - add phonegap for contacts.
; - add back/forward browser integration -> needed for back button
; - logs on error sql
