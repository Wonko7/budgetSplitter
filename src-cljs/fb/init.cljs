(ns fb.init
  (:use [fb.jq :only [$ clj->js]]))
        

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; init
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(def inits {:any [] :last []})

(defn add-init!
  ([f last]
   (def inits {:last (conj (:last inits) f)
               :any  (:any inits)}))
  ([f]
   (def inits {:any  (conj (:any inits) f)
               :last (:last inits)})))

(defn do-inits []
  ($ #(do
        (doseq [f (concat (:any inits) (:last inits))]
          (f)))))

(do-inits)
