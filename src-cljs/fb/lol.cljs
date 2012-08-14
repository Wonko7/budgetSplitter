(ns fb.lol
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]
        [fb.sql :only [nuke-db do-proj do-buddies do-row row-seq do-cost do-costs add-cost add-buddy add-proj add-db! db-init]]
        [fb.vis :only [set-title-project set-rect-back set-tot-rect-back money buddy]]
        ; FIXME get :use to import everything.
        ))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; page loading
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(def page-dyn-inits {})
(def back-pages nil)
(def jQT nil)

(defn add-init! [name func]
  (def page-dyn-inits (into page-dyn-inits {name func})))

(defn load-template [name]
  (let [temp ($ (str "div.hidden div." name))
        temp (if (zero? (.-length temp)) ($ "div.hidden div.404") temp)
        body ($ "body")
        newp (.hide ($ "<div id=\"newpage\"></div>"))]
    (.append body
             (-> newp
               (.append ($ "<div class=\"top\"></div>"))
               (.append (.append ($ "<div class=\"middle\"></div>")
                                 (.clone temp)))
               (.append ($ "<div class=\"bottom\"></div>"))
               (.append )))))

(defn swap-page [e a]
  (let [newp (.show ($ "#newpage"))
        cont ($ "#content")
        back? (if a (= "back" (.data a "anim")) false)]
    (if back? ; condp on animation
      (.goTo jQT "#newpage" "slideright")
      (.goTo jQT "#newpage" "slideleft"))
    (.attr newp "id" "content")
    (.attr cont "id" "old")))

; FIXME add this to an init function
($ #(.bind ($ "body") "pageAnimationEnd" (fn [e info]
                                           (.remove ($ "#old")))))

(defn load-dyn-page [name e a]
  (when (not= name "back")
    (def back-pages (cons [name (doall (cons ["anim" "back"]
                                             (map #(vector % (.data a %)) ["pid" "bid" "cid"])))]
                          (take 15 back-pages))))
  (if-let [f (page-dyn-inits name)]
    (f e a)
    (do
      (load-template name)
      (swap-page e a))))

; FIXME add this to an init function
($ #(delegate ($ "body") "a" "click touchend"
              (fn [e]
                (let [a    ($ (first ($ (.-currentTarget e))))
                      link (.attr a "href")]
                  (load-dyn-page link e a)
                  false))))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; pages
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; show all projects
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
                                       ;(.addClass "arrow")
                                       (.append (-> ($ "<a></a>")
                                                  (.text (.-name i))
                                                  (.attr "href" "proj")
                                                  (.data "pid" (.-id i)))))))
                       r)
               (swap-page e a)))))

;; show a project and its costs
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
                                      (.text "Add Cost")
                                      (.data "pid" pid)
                                      (.attr "href" "newcost")))))
        set-proj-data (fn [id name tot tx]
                        (.data ($ "#newpage div.proj div.menu a") "pid" pid)
                        (do-costs (fn [tx r]
                                    (do-row #(let [a  (-> a
                                                        (.clone)
                                                        (.text (str (.-name %) ": " ))
                                                        (.append (money (.-tot %)))
                                                        (.data "cid" (.-id %))
                                                        (.data "pid" pid)
                                                        (.attr "href" "cost"))
                                                   li (-> li
                                                        (.clone)
                                                        (.append a)
                                                        ;(.addClass "arrow")
                                                        (set-rect-back tot (.-tot %)))]
                                               (.append ul li))
                                            r))
                                  pid)
                        (swap-page e origa))]
    (set-title-project set-proj-data pid)))

;; show a cost detail: buddies
(defn show-cost [e origa]
  (load-template "cost")
  (let [pid           (.data origa "pid")
        cid           (.data origa "cid")
        ul            ($ "#newpage div.cost div ul")
        ti            ($ "#newpage div.cost div.title")
        li            ($ "<li></li>")
        a             ($ "<a></a>")
        set-cost-data (fn [id name tot tx]
                        ;; FIXME should other buddies be shown? $0?
                        (do-cost (fn [tx r]
                                   (let [i (.item (.-rows r) 0)]
                                     (-> ti
                                       (.append (str (.-cname i) ": "))
                                       (.append (money (.-ctot i)))))
                                   (do-row #(let [a   (-> a
                                                        (.clone)
                                                        (.append (buddy (.-bname %)))
                                                        (.append ": ")
                                                        (.append (money (.-btot %)))
                                                        (.data "cid" cid)
                                                        (.data "pid" pid))
                                                  li  (-> li
                                                        (.clone)
                                                        (.append a)
                                                        (set-rect-back (.-ctot %) (.-btot %)))]
                                              (.append ul li))
                                           r)
                                   (swap-page e origa))
                                 cid))]
    (set-title-project set-cost-data pid)))

;; show total
(defn show-total [e origa]
  (load-template "total")
  (let [pid           (.data origa "pid")
        ul            ($ "#newpage div.total div ul")
        li            ($ "<li></li>")
        ;a             ($ "<a></a>")
        set-total-data (fn [id name tot tx]
                        (do-buddies (fn [tx r]
                                      (let [nbb     (.-length (.-rows r))
                                            av      (/ tot nbb)
                                            abs     #(if (< 0 %) % (- %))
                                            buds    (for [b (row-seq r)]
                                                      [(abs (- av (.-btot b))) (.-btot b) (.-name b)])
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
                                                        ac
                                                        ;(do (js/console.log (str t " : " g)) ac)
                                                        ))]
                                        (doseq [[d t n] buds]
                                          (.append ul (-> li
                                                        (.clone)
                                                        (.append (buddy n))
                                                        (.append " paid: ")
                                                        (.append (money t))
                                                        (.append (if (> t av)
                                                                   ": needs "
                                                                   ": owes "))
                                                        (.append (money d))
                                                        (set-tot-rect-back maxpaid av t))))
                                        (doseq [[gn tn tot] owes]
                                          (.append ul (-> li
                                                        (.clone)
                                                        (.append (buddy gn))
                                                        (.append " owes ")
                                                        (.append (money tot))
                                                        (.append " to ")
                                                        (.append (buddy tn))))))
                                      (swap-page e origa))
                                    pid))]
    (set-title-project set-total-data pid)))

(add-init! "projects" show-projects)
(add-init! "proj" show-proj)
(add-init! "cost" show-cost)
(add-init! "total" show-total)


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
  (let [name (.val ($ "#content div.new form [name=\"name\"]"))
        addp (fn [tx r]
               (trigger-new-page "proj" [["pid" (.-insertId r)]]))]
    ; FIXME make contracts
    (if (<= (count name) 0)
      (js/alert "Invalid name")
      (add-proj name addp)))
  false)

(defn show-new-form [e origa]
  (load-template "new")
  (let [addb ($ "#newpage div.new form [type=\"submit\"]")
        inp  ($ "#newpage div.new form [name=\"name\"]")
        validate #(let [z? (zero? (count (.val inp)))]
                    (if z?
                      (.hide addb)
                      (.show addb)))]
    (.hide addb)
    (.keyup inp validate)
    (.submit ($ "#newpage div.new form") add-page-project)
    (swap-page e origa)))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; show buddies & add form

(defn append-buddy [ul li pid bid name ptot btot]
  (.append ul (-> li
                (.clone)
                (.append (buddy name))
                (.append ": ")
                (.append (money btot))
                (.data "bid" bid)
                (.data "pid" pid)
                (set-rect-back ptot btot))))

(defn add-page-buddy []
  (let [i    ($ "#content div.buddies form [name=\"name\"]")
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

(defn show-buddies [e origa]
  (load-template "buddies")
  (let [pid     (.data origa "pid")
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
                          (swap-page e origa))]
    (set-title-project set-buddy-data pid)))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; new-cost

(defn add-page-cost []
  (let [i     ($ "#content div.newcost form [name=\"name\"]")
        name  (.val i)
        pid   (.data i "pid")
        alli  ($ "#content div.newcost form div.buddieslist [name=\"tot\"]")
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

(defn show-new-cost [e origa]
  (load-template "newcost")
  (let [pid     (.data origa "pid")
        inp     ($ "#newpage div.newcost form [name=\"name\"]")
        ul      ($ "#newpage div.newcost form div.buddieslist ul")
        label   ($ "<label></label>")
        li      ($ "<li></li>")
        binput  ($ "<input type=\"text\" class=\"numbers\" name=\"tot\" />")
        validate        (fn [e]
                          (let [inp  ($ (.-currentTarget e))
                                v     (.val inp)
                                total ($ "#content div.newcost .costtotal")
                                alli  ($ "#content div.newcost form div.buddieslist [name=\"tot\"]")]
                            (.val inp (.replace v #"^[^0-9]*([0-9]+\.?[0-9]*)?.*$" "$1"))
                            (.html total (money (reduce + (for [i alli]
                                                            (int (.val ($ i)))))))))
        set-buddy-data  (fn [id name tot tx]
                          (.data inp "pid" pid)
                          (.submit ($ "#newpage div.newcost form") add-page-cost)
                          (do-buddies (fn [tx r]
                                        (if (> (.-length (.-rows r)) 0)
                                          (do-row #(-> ul
                                                     (.append (-> li
                                                                (.clone)
                                                                (.append (-> label
                                                                           (.clone)
                                                                           (.append (buddy (.-name %)))
                                                                           (.append ":")))
                                                                (.append (-> binput
                                                                           (.clone)
                                                                           (.data "pid" pid)
                                                                           (.data "bid" (.-id %))
                                                                           (.attr "placeholder" (str (.-name %) " paid..."))
                                                                           (.keyup validate)))
                                                                (.bind "focus click touchend"
                                                                       (fn [e]
                                                                         (.trigger (.children ($ (.-currentTarget e))
                                                                                              "input")
                                                                                   "focus"))))))
                                                  r)
                                          (do
                                            (.remove ($ "#content div.newcost form input[type=\"submit\"]"))
                                            (.append ul (-> li
                                                          (.clone)
                                                          (.append (-> ($ "<a></a>")
                                                                     (.attr "href" "buddies")
                                                                     (.data "pid" pid)
                                                                     (.text "Add buddies first!"))))))))
                                      pid)
                          (swap-page e origa))]
    (set-title-project set-buddy-data pid)))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; back;

(defn go-back [e]
  (let [[x [name d] & bs] back-pages]
    (def back-pages bs)
    (trigger-new-page name d)))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; inits;

(add-init! "buddies" show-buddies)
(add-init! "new" show-new-form)
(add-init! "newcost" show-new-cost)
(add-init! "back" go-back)


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; jqt
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

($
  ;#(def jQT (.jQTouch js/jQuery (clj->js {:icon "img/icon.png"}))) ; FIXME get this working with $
  #(def jQT (.jQTouch js/jQuery (js-obj "icon" "img/icon.png"))) ; FIXME get this working with $
 )


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
