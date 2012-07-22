(ns fb.lol
  (:use [jayq.core :only [$ inner]]))

;(def currentpage "projects")

(defn load-page [name]
  (let [newp ($ (str "#" name))
        newp (if (zero? (.-length newp)) ($ "#404") newp)
        ;curr ($ (str "#" currentpage))
        curr ($ "#content")
        ]
    (.hide 10 curr)
    (.empty curr)
    (.html curr (.html newp))
    (.show 10 curr)
    ))

($
  #(jayq.core/delegate ($ "body") "a" :click
           (fn [e]
             (let [a    ($ (.-currentTarget e))
                   link (.attr a "href")]
               ;(.preventDefault e)
               ;(js/alert (str "#" link))
               (load-page link)
               false)))) 

($ #(load-page "projects"))
