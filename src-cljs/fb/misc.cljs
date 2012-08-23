(ns fb.misc
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]
        ))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; misc
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;


(defn mk-settings [r]
  (let [i (.item (.-rows r) 0)]
    {:menuOn  (= 1 (.-menuOn i))
     :help    (= 1 (.-help i))
     :menuPos (if (= 1 (.-menuPos i)) :top :bottom)
     :theme   (.-theme i)}))

(defn add-data [elt name data]
  (if-let [d (name data)]
    (reduce (fn [e [k v]]
              (.data e k v)) elt d)
    elt))

(defn trim [s]
  (.replace s #"^(.*\S)\s*$" "$1"))

(defn num [n]
  (js/Number n))

(defn get-current-page [type]
  (if (= type :current)
    (.attr ($ "#content div.middle div:first") "class")
    (.attr ($ "#newpage div.middle div:first") "class")))
