(ns fb.back
  (:use [fb.misc :only [get-current-page]]))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; stack;

(def back-pages nil)

(defn get-back [[[fname fd] & bs :as back-pages] current]
  (if (= fname (get-current-page current)) 
    bs 
    back-pages))

(defn get-back-href []
  (let [[[name d] & bs] (get-back back-pages :newpage)]
    name));; FIXME wtf

(defn rm-from-back! [key val]
  (def back-pages
    (for [[name data :as bp] back-pages
          :let  [v (key (apply hash-map (flatten (name data))))]
          :when (not= v val)]
      bp)))

(defn update-back! [name a]
  ;(when (= name "settings")
  ;  (let [[[name data] & back-end] back-pages]
  ;    (def back-pages
  ;      (cons [name {name (replace {["anim" "slideright"] ["anim" "flipleft"]} (name data))}]
  ;            back-end)))) ;; another solution would be to read back anim data and use it on the page to load.
  (when (some #(= name %1) ["proj" "projects" "buddies" "indivbuddy" "total" "settings"])
    ;(js/console.log "added " name)
    (def back-pages (cons [name {name (doall (cons ["anim" "slideright"]
                                                   (map #(vector % (.data a %)) ["pid" "bid" "cid"])))}]
                          (take 15 back-pages)))))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; back;

(defn go-back [trigger-new-page e]
  (let [[[name d] & bs] (get-back back-pages :current)]
    (def back-pages bs)
    (if name
      (trigger-new-page name d)
      (trigger-new-page "projects" nil))))
