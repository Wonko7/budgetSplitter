(ns fb.jq)

(def $ js/jQuery)

;; taken from jayq

(extend-type js/jQuery
  ISeqable
  (-seq [this] (when (.get this 0)
                 this))
  ISeq
  (-first [this] (.get this 0))
  (-rest [this] (if (> (count this) 1)
                  (.slice this 1)
                  (list)))

  ICounted
  (-count [this] (. this (size)))

  IIndexed
  (-nth [this n]
    (when (< n (count this))
      (.slice this n (inc n))))
  (-nth [this n not-found]
    (if (< n (count this))
      (.slice this n (inc n))
      (if (undefined? not-found)
        nil
        not-found)))

  ISequential

  ILookup
  (-lookup
    ([this k]
       (or (.slice this k (inc k)) nil))
    ([this k not-found]
       (-nth this k not-found)))

  IReduce
  (-reduce [this f]
    (ci-reduce this f))
  (-reduce [this f start]
    (ci-reduce this f start)))

(defn clj->js
  "Recursively transforms ClojureScript maps into Javascript objects,
   other ClojureScript colls into JavaScript arrays, and ClojureScript
   keywords into JavaScript strings."
  [x]
  (cond
    (string? x) x
    (keyword? x) (name x)
    (map? x) (.-strobj (reduce (fn [m [k v]]
               (assoc m (clj->js k) (clj->js v))) {} x))
    (coll? x) (apply array (map clj->js x))
    :else x))
