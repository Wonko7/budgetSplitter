var COMPILED = false;
var goog = goog || {};
goog.global = this;
goog.DEBUG = true;
goog.LOCALE = "en";
goog.provide = function(name) {
  if(!COMPILED) {
    if(goog.isProvided_(name)) {
      throw Error('Namespace "' + name + '" already declared.');
    }
    delete goog.implicitNamespaces_[name];
    var namespace = name;
    while(namespace = namespace.substring(0, namespace.lastIndexOf("."))) {
      if(goog.getObjectByName(namespace)) {
        break
      }
      goog.implicitNamespaces_[namespace] = true
    }
  }
  goog.exportPath_(name)
};
goog.setTestOnly = function(opt_message) {
  if(COMPILED && !goog.DEBUG) {
    opt_message = opt_message || "";
    throw Error("Importing test-only code into non-debug environment" + opt_message ? ": " + opt_message : ".");
  }
};
if(!COMPILED) {
  goog.isProvided_ = function(name) {
    return!goog.implicitNamespaces_[name] && !!goog.getObjectByName(name)
  };
  goog.implicitNamespaces_ = {}
}
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split(".");
  var cur = opt_objectToExportTo || goog.global;
  if(!(parts[0] in cur) && cur.execScript) {
    cur.execScript("var " + parts[0])
  }
  for(var part;parts.length && (part = parts.shift());) {
    if(!parts.length && goog.isDef(opt_object)) {
      cur[part] = opt_object
    }else {
      if(cur[part]) {
        cur = cur[part]
      }else {
        cur = cur[part] = {}
      }
    }
  }
};
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split(".");
  var cur = opt_obj || goog.global;
  for(var part;part = parts.shift();) {
    if(goog.isDefAndNotNull(cur[part])) {
      cur = cur[part]
    }else {
      return null
    }
  }
  return cur
};
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for(var x in obj) {
    global[x] = obj[x]
  }
};
goog.addDependency = function(relPath, provides, requires) {
  if(!COMPILED) {
    var provide, require;
    var path = relPath.replace(/\\/g, "/");
    var deps = goog.dependencies_;
    for(var i = 0;provide = provides[i];i++) {
      deps.nameToPath[provide] = path;
      if(!(path in deps.pathToNames)) {
        deps.pathToNames[path] = {}
      }
      deps.pathToNames[path][provide] = true
    }
    for(var j = 0;require = requires[j];j++) {
      if(!(path in deps.requires)) {
        deps.requires[path] = {}
      }
      deps.requires[path][require] = true
    }
  }
};
goog.ENABLE_DEBUG_LOADER = true;
goog.require = function(name) {
  if(!COMPILED) {
    if(goog.isProvided_(name)) {
      return
    }
    if(goog.ENABLE_DEBUG_LOADER) {
      var path = goog.getPathFromDeps_(name);
      if(path) {
        goog.included_[path] = true;
        goog.writeScripts_();
        return
      }
    }
    var errorMessage = "goog.require could not find: " + name;
    if(goog.global.console) {
      goog.global.console["error"](errorMessage)
    }
    throw Error(errorMessage);
  }
};
goog.basePath = "";
goog.global.CLOSURE_BASE_PATH;
goog.global.CLOSURE_NO_DEPS;
goog.global.CLOSURE_IMPORT_SCRIPT;
goog.nullFunction = function() {
};
goog.identityFunction = function(var_args) {
  return arguments[0]
};
goog.abstractMethod = function() {
  throw Error("unimplemented abstract method");
};
goog.addSingletonGetter = function(ctor) {
  ctor.getInstance = function() {
    return ctor.instance_ || (ctor.instance_ = new ctor)
  }
};
if(!COMPILED && goog.ENABLE_DEBUG_LOADER) {
  goog.included_ = {};
  goog.dependencies_ = {pathToNames:{}, nameToPath:{}, requires:{}, visited:{}, written:{}};
  goog.inHtmlDocument_ = function() {
    var doc = goog.global.document;
    return typeof doc != "undefined" && "write" in doc
  };
  goog.findBasePath_ = function() {
    if(goog.global.CLOSURE_BASE_PATH) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return
    }else {
      if(!goog.inHtmlDocument_()) {
        return
      }
    }
    var doc = goog.global.document;
    var scripts = doc.getElementsByTagName("script");
    for(var i = scripts.length - 1;i >= 0;--i) {
      var src = scripts[i].src;
      var qmark = src.lastIndexOf("?");
      var l = qmark == -1 ? src.length : qmark;
      if(src.substr(l - 7, 7) == "base.js") {
        goog.basePath = src.substr(0, l - 7);
        return
      }
    }
  };
  goog.importScript_ = function(src) {
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT || goog.writeScriptTag_;
    if(!goog.dependencies_.written[src] && importScript(src)) {
      goog.dependencies_.written[src] = true
    }
  };
  goog.writeScriptTag_ = function(src) {
    if(goog.inHtmlDocument_()) {
      var doc = goog.global.document;
      doc.write('<script type="text/javascript" src="' + src + '"></' + "script>");
      return true
    }else {
      return false
    }
  };
  goog.writeScripts_ = function() {
    var scripts = [];
    var seenScript = {};
    var deps = goog.dependencies_;
    function visitNode(path) {
      if(path in deps.written) {
        return
      }
      if(path in deps.visited) {
        if(!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path)
        }
        return
      }
      deps.visited[path] = true;
      if(path in deps.requires) {
        for(var requireName in deps.requires[path]) {
          if(!goog.isProvided_(requireName)) {
            if(requireName in deps.nameToPath) {
              visitNode(deps.nameToPath[requireName])
            }else {
              throw Error("Undefined nameToPath for " + requireName);
            }
          }
        }
      }
      if(!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path)
      }
    }
    for(var path in goog.included_) {
      if(!deps.written[path]) {
        visitNode(path)
      }
    }
    for(var i = 0;i < scripts.length;i++) {
      if(scripts[i]) {
        goog.importScript_(goog.basePath + scripts[i])
      }else {
        throw Error("Undefined script input");
      }
    }
  };
  goog.getPathFromDeps_ = function(rule) {
    if(rule in goog.dependencies_.nameToPath) {
      return goog.dependencies_.nameToPath[rule]
    }else {
      return null
    }
  };
  goog.findBasePath_();
  if(!goog.global.CLOSURE_NO_DEPS) {
    goog.importScript_(goog.basePath + "deps.js")
  }
}
goog.typeOf = function(value) {
  var s = typeof value;
  if(s == "object") {
    if(value) {
      if(value instanceof Array) {
        return"array"
      }else {
        if(value instanceof Object) {
          return s
        }
      }
      var className = Object.prototype.toString.call(value);
      if(className == "[object Window]") {
        return"object"
      }
      if(className == "[object Array]" || typeof value.length == "number" && typeof value.splice != "undefined" && typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("splice")) {
        return"array"
      }
      if(className == "[object Function]" || typeof value.call != "undefined" && typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("call")) {
        return"function"
      }
    }else {
      return"null"
    }
  }else {
    if(s == "function" && typeof value.call == "undefined") {
      return"object"
    }
  }
  return s
};
goog.propertyIsEnumerableCustom_ = function(object, propName) {
  if(propName in object) {
    for(var key in object) {
      if(key == propName && Object.prototype.hasOwnProperty.call(object, propName)) {
        return true
      }
    }
  }
  return false
};
goog.propertyIsEnumerable_ = function(object, propName) {
  if(object instanceof Object) {
    return Object.prototype.propertyIsEnumerable.call(object, propName)
  }else {
    return goog.propertyIsEnumerableCustom_(object, propName)
  }
};
goog.isDef = function(val) {
  return val !== undefined
};
goog.isNull = function(val) {
  return val === null
};
goog.isDefAndNotNull = function(val) {
  return val != null
};
goog.isArray = function(val) {
  return goog.typeOf(val) == "array"
};
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  return type == "array" || type == "object" && typeof val.length == "number"
};
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == "function"
};
goog.isString = function(val) {
  return typeof val == "string"
};
goog.isBoolean = function(val) {
  return typeof val == "boolean"
};
goog.isNumber = function(val) {
  return typeof val == "number"
};
goog.isFunction = function(val) {
  return goog.typeOf(val) == "function"
};
goog.isObject = function(val) {
  var type = goog.typeOf(val);
  return type == "object" || type == "array" || type == "function"
};
goog.getUid = function(obj) {
  return obj[goog.UID_PROPERTY_] || (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_)
};
goog.removeUid = function(obj) {
  if("removeAttribute" in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_)
  }
  try {
    delete obj[goog.UID_PROPERTY_]
  }catch(ex) {
  }
};
goog.UID_PROPERTY_ = "closure_uid_" + Math.floor(Math.random() * 2147483648).toString(36);
goog.uidCounter_ = 0;
goog.getHashCode = goog.getUid;
goog.removeHashCode = goog.removeUid;
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if(type == "object" || type == "array") {
    if(obj.clone) {
      return obj.clone()
    }
    var clone = type == "array" ? [] : {};
    for(var key in obj) {
      clone[key] = goog.cloneObject(obj[key])
    }
    return clone
  }
  return obj
};
Object.prototype.clone;
goog.bindNative_ = function(fn, selfObj, var_args) {
  return fn.call.apply(fn.bind, arguments)
};
goog.bindJs_ = function(fn, selfObj, var_args) {
  if(!fn) {
    throw new Error;
  }
  if(arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(selfObj, newArgs)
    }
  }else {
    return function() {
      return fn.apply(selfObj, arguments)
    }
  }
};
goog.bind = function(fn, selfObj, var_args) {
  if(Function.prototype.bind && Function.prototype.bind.toString().indexOf("native code") != -1) {
    goog.bind = goog.bindNative_
  }else {
    goog.bind = goog.bindJs_
  }
  return goog.bind.apply(null, arguments)
};
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    var newArgs = Array.prototype.slice.call(arguments);
    newArgs.unshift.apply(newArgs, args);
    return fn.apply(this, newArgs)
  }
};
goog.mixin = function(target, source) {
  for(var x in source) {
    target[x] = source[x]
  }
};
goog.now = Date.now || function() {
  return+new Date
};
goog.globalEval = function(script) {
  if(goog.global.execScript) {
    goog.global.execScript(script, "JavaScript")
  }else {
    if(goog.global.eval) {
      if(goog.evalWorksForGlobals_ == null) {
        goog.global.eval("var _et_ = 1;");
        if(typeof goog.global["_et_"] != "undefined") {
          delete goog.global["_et_"];
          goog.evalWorksForGlobals_ = true
        }else {
          goog.evalWorksForGlobals_ = false
        }
      }
      if(goog.evalWorksForGlobals_) {
        goog.global.eval(script)
      }else {
        var doc = goog.global.document;
        var scriptElt = doc.createElement("script");
        scriptElt.type = "text/javascript";
        scriptElt.defer = false;
        scriptElt.appendChild(doc.createTextNode(script));
        doc.body.appendChild(scriptElt);
        doc.body.removeChild(scriptElt)
      }
    }else {
      throw Error("goog.globalEval not available");
    }
  }
};
goog.evalWorksForGlobals_ = null;
goog.cssNameMapping_;
goog.cssNameMappingStyle_;
goog.getCssName = function(className, opt_modifier) {
  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName
  };
  var renameByParts = function(cssName) {
    var parts = cssName.split("-");
    var mapped = [];
    for(var i = 0;i < parts.length;i++) {
      mapped.push(getMapping(parts[i]))
    }
    return mapped.join("-")
  };
  var rename;
  if(goog.cssNameMapping_) {
    rename = goog.cssNameMappingStyle_ == "BY_WHOLE" ? getMapping : renameByParts
  }else {
    rename = function(a) {
      return a
    }
  }
  if(opt_modifier) {
    return className + "-" + rename(opt_modifier)
  }else {
    return rename(className)
  }
};
goog.setCssNameMapping = function(mapping, opt_style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = opt_style
};
goog.global.CLOSURE_CSS_NAME_MAPPING;
if(!COMPILED && goog.global.CLOSURE_CSS_NAME_MAPPING) {
  goog.cssNameMapping_ = goog.global.CLOSURE_CSS_NAME_MAPPING
}
goog.getMsg = function(str, opt_values) {
  var values = opt_values || {};
  for(var key in values) {
    var value = ("" + values[key]).replace(/\$/g, "$$$$");
    str = str.replace(new RegExp("\\{\\$" + key + "\\}", "gi"), value)
  }
  return str
};
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo)
};
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol
};
goog.inherits = function(childCtor, parentCtor) {
  function tempCtor() {
  }
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor;
  childCtor.prototype.constructor = childCtor
};
goog.base = function(me, opt_methodName, var_args) {
  var caller = arguments.callee.caller;
  if(caller.superClass_) {
    return caller.superClass_.constructor.apply(me, Array.prototype.slice.call(arguments, 1))
  }
  var args = Array.prototype.slice.call(arguments, 2);
  var foundCaller = false;
  for(var ctor = me.constructor;ctor;ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if(ctor.prototype[opt_methodName] === caller) {
      foundCaller = true
    }else {
      if(foundCaller) {
        return ctor.prototype[opt_methodName].apply(me, args)
      }
    }
  }
  if(me[opt_methodName] === caller) {
    return me.constructor.prototype[opt_methodName].apply(me, args)
  }else {
    throw Error("goog.base called from a method of one name " + "to a method of a different name");
  }
};
goog.scope = function(fn) {
  fn.call(goog.global)
};
goog.provide("goog.debug.Error");
goog.debug.Error = function(opt_msg) {
  this.stack = (new Error).stack || "";
  if(opt_msg) {
    this.message = String(opt_msg)
  }
};
goog.inherits(goog.debug.Error, Error);
goog.debug.Error.prototype.name = "CustomError";
goog.provide("goog.string");
goog.provide("goog.string.Unicode");
goog.string.Unicode = {NBSP:"\u00a0"};
goog.string.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0
};
goog.string.endsWith = function(str, suffix) {
  var l = str.length - suffix.length;
  return l >= 0 && str.indexOf(suffix, l) == l
};
goog.string.caseInsensitiveStartsWith = function(str, prefix) {
  return goog.string.caseInsensitiveCompare(prefix, str.substr(0, prefix.length)) == 0
};
goog.string.caseInsensitiveEndsWith = function(str, suffix) {
  return goog.string.caseInsensitiveCompare(suffix, str.substr(str.length - suffix.length, suffix.length)) == 0
};
goog.string.subs = function(str, var_args) {
  for(var i = 1;i < arguments.length;i++) {
    var replacement = String(arguments[i]).replace(/\$/g, "$$$$");
    str = str.replace(/\%s/, replacement)
  }
  return str
};
goog.string.collapseWhitespace = function(str) {
  return str.replace(/[\s\xa0]+/g, " ").replace(/^\s+|\s+$/g, "")
};
goog.string.isEmpty = function(str) {
  return/^[\s\xa0]*$/.test(str)
};
goog.string.isEmptySafe = function(str) {
  return goog.string.isEmpty(goog.string.makeSafe(str))
};
goog.string.isBreakingWhitespace = function(str) {
  return!/[^\t\n\r ]/.test(str)
};
goog.string.isAlpha = function(str) {
  return!/[^a-zA-Z]/.test(str)
};
goog.string.isNumeric = function(str) {
  return!/[^0-9]/.test(str)
};
goog.string.isAlphaNumeric = function(str) {
  return!/[^a-zA-Z0-9]/.test(str)
};
goog.string.isSpace = function(ch) {
  return ch == " "
};
goog.string.isUnicodeChar = function(ch) {
  return ch.length == 1 && ch >= " " && ch <= "~" || ch >= "\u0080" && ch <= "\ufffd"
};
goog.string.stripNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)+/g, " ")
};
goog.string.canonicalizeNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)/g, "\n")
};
goog.string.normalizeWhitespace = function(str) {
  return str.replace(/\xa0|\s/g, " ")
};
goog.string.normalizeSpaces = function(str) {
  return str.replace(/\xa0|[ \t]+/g, " ")
};
goog.string.collapseBreakingSpaces = function(str) {
  return str.replace(/[\t\r\n ]+/g, " ").replace(/^[\t\r\n ]+|[\t\r\n ]+$/g, "")
};
goog.string.trim = function(str) {
  return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, "")
};
goog.string.trimLeft = function(str) {
  return str.replace(/^[\s\xa0]+/, "")
};
goog.string.trimRight = function(str) {
  return str.replace(/[\s\xa0]+$/, "")
};
goog.string.caseInsensitiveCompare = function(str1, str2) {
  var test1 = String(str1).toLowerCase();
  var test2 = String(str2).toLowerCase();
  if(test1 < test2) {
    return-1
  }else {
    if(test1 == test2) {
      return 0
    }else {
      return 1
    }
  }
};
goog.string.numerateCompareRegExp_ = /(\.\d+)|(\d+)|(\D+)/g;
goog.string.numerateCompare = function(str1, str2) {
  if(str1 == str2) {
    return 0
  }
  if(!str1) {
    return-1
  }
  if(!str2) {
    return 1
  }
  var tokens1 = str1.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var tokens2 = str2.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var count = Math.min(tokens1.length, tokens2.length);
  for(var i = 0;i < count;i++) {
    var a = tokens1[i];
    var b = tokens2[i];
    if(a != b) {
      var num1 = parseInt(a, 10);
      if(!isNaN(num1)) {
        var num2 = parseInt(b, 10);
        if(!isNaN(num2) && num1 - num2) {
          return num1 - num2
        }
      }
      return a < b ? -1 : 1
    }
  }
  if(tokens1.length != tokens2.length) {
    return tokens1.length - tokens2.length
  }
  return str1 < str2 ? -1 : 1
};
goog.string.encodeUriRegExp_ = /^[a-zA-Z0-9\-_.!~*'()]*$/;
goog.string.urlEncode = function(str) {
  str = String(str);
  if(!goog.string.encodeUriRegExp_.test(str)) {
    return encodeURIComponent(str)
  }
  return str
};
goog.string.urlDecode = function(str) {
  return decodeURIComponent(str.replace(/\+/g, " "))
};
goog.string.newLineToBr = function(str, opt_xml) {
  return str.replace(/(\r\n|\r|\n)/g, opt_xml ? "<br />" : "<br>")
};
goog.string.htmlEscape = function(str, opt_isLikelyToContainHtmlChars) {
  if(opt_isLikelyToContainHtmlChars) {
    return str.replace(goog.string.amperRe_, "&amp;").replace(goog.string.ltRe_, "&lt;").replace(goog.string.gtRe_, "&gt;").replace(goog.string.quotRe_, "&quot;")
  }else {
    if(!goog.string.allRe_.test(str)) {
      return str
    }
    if(str.indexOf("&") != -1) {
      str = str.replace(goog.string.amperRe_, "&amp;")
    }
    if(str.indexOf("<") != -1) {
      str = str.replace(goog.string.ltRe_, "&lt;")
    }
    if(str.indexOf(">") != -1) {
      str = str.replace(goog.string.gtRe_, "&gt;")
    }
    if(str.indexOf('"') != -1) {
      str = str.replace(goog.string.quotRe_, "&quot;")
    }
    return str
  }
};
goog.string.amperRe_ = /&/g;
goog.string.ltRe_ = /</g;
goog.string.gtRe_ = />/g;
goog.string.quotRe_ = /\"/g;
goog.string.allRe_ = /[&<>\"]/;
goog.string.unescapeEntities = function(str) {
  if(goog.string.contains(str, "&")) {
    if("document" in goog.global) {
      return goog.string.unescapeEntitiesUsingDom_(str)
    }else {
      return goog.string.unescapePureXmlEntities_(str)
    }
  }
  return str
};
goog.string.unescapeEntitiesUsingDom_ = function(str) {
  var seen = {"&amp;":"&", "&lt;":"<", "&gt;":">", "&quot;":'"'};
  var div = document.createElement("div");
  return str.replace(goog.string.HTML_ENTITY_PATTERN_, function(s, entity) {
    var value = seen[s];
    if(value) {
      return value
    }
    if(entity.charAt(0) == "#") {
      var n = Number("0" + entity.substr(1));
      if(!isNaN(n)) {
        value = String.fromCharCode(n)
      }
    }
    if(!value) {
      div.innerHTML = s + " ";
      value = div.firstChild.nodeValue.slice(0, -1)
    }
    return seen[s] = value
  })
};
goog.string.unescapePureXmlEntities_ = function(str) {
  return str.replace(/&([^;]+);/g, function(s, entity) {
    switch(entity) {
      case "amp":
        return"&";
      case "lt":
        return"<";
      case "gt":
        return">";
      case "quot":
        return'"';
      default:
        if(entity.charAt(0) == "#") {
          var n = Number("0" + entity.substr(1));
          if(!isNaN(n)) {
            return String.fromCharCode(n)
          }
        }
        return s
    }
  })
};
goog.string.HTML_ENTITY_PATTERN_ = /&([^;\s<&]+);?/g;
goog.string.whitespaceEscape = function(str, opt_xml) {
  return goog.string.newLineToBr(str.replace(/  /g, " &#160;"), opt_xml)
};
goog.string.stripQuotes = function(str, quoteChars) {
  var length = quoteChars.length;
  for(var i = 0;i < length;i++) {
    var quoteChar = length == 1 ? quoteChars : quoteChars.charAt(i);
    if(str.charAt(0) == quoteChar && str.charAt(str.length - 1) == quoteChar) {
      return str.substring(1, str.length - 1)
    }
  }
  return str
};
goog.string.truncate = function(str, chars, opt_protectEscapedCharacters) {
  if(opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str)
  }
  if(str.length > chars) {
    str = str.substring(0, chars - 3) + "..."
  }
  if(opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str)
  }
  return str
};
goog.string.truncateMiddle = function(str, chars, opt_protectEscapedCharacters, opt_trailingChars) {
  if(opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str)
  }
  if(opt_trailingChars && str.length > chars) {
    if(opt_trailingChars > chars) {
      opt_trailingChars = chars
    }
    var endPoint = str.length - opt_trailingChars;
    var startPoint = chars - opt_trailingChars;
    str = str.substring(0, startPoint) + "..." + str.substring(endPoint)
  }else {
    if(str.length > chars) {
      var half = Math.floor(chars / 2);
      var endPos = str.length - half;
      half += chars % 2;
      str = str.substring(0, half) + "..." + str.substring(endPos)
    }
  }
  if(opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str)
  }
  return str
};
goog.string.specialEscapeChars_ = {"\x00":"\\0", "\u0008":"\\b", "\u000c":"\\f", "\n":"\\n", "\r":"\\r", "\t":"\\t", "\x0B":"\\x0B", '"':'\\"', "\\":"\\\\"};
goog.string.jsEscapeCache_ = {"'":"\\'"};
goog.string.quote = function(s) {
  s = String(s);
  if(s.quote) {
    return s.quote()
  }else {
    var sb = ['"'];
    for(var i = 0;i < s.length;i++) {
      var ch = s.charAt(i);
      var cc = ch.charCodeAt(0);
      sb[i + 1] = goog.string.specialEscapeChars_[ch] || (cc > 31 && cc < 127 ? ch : goog.string.escapeChar(ch))
    }
    sb.push('"');
    return sb.join("")
  }
};
goog.string.escapeString = function(str) {
  var sb = [];
  for(var i = 0;i < str.length;i++) {
    sb[i] = goog.string.escapeChar(str.charAt(i))
  }
  return sb.join("")
};
goog.string.escapeChar = function(c) {
  if(c in goog.string.jsEscapeCache_) {
    return goog.string.jsEscapeCache_[c]
  }
  if(c in goog.string.specialEscapeChars_) {
    return goog.string.jsEscapeCache_[c] = goog.string.specialEscapeChars_[c]
  }
  var rv = c;
  var cc = c.charCodeAt(0);
  if(cc > 31 && cc < 127) {
    rv = c
  }else {
    if(cc < 256) {
      rv = "\\x";
      if(cc < 16 || cc > 256) {
        rv += "0"
      }
    }else {
      rv = "\\u";
      if(cc < 4096) {
        rv += "0"
      }
    }
    rv += cc.toString(16).toUpperCase()
  }
  return goog.string.jsEscapeCache_[c] = rv
};
goog.string.toMap = function(s) {
  var rv = {};
  for(var i = 0;i < s.length;i++) {
    rv[s.charAt(i)] = true
  }
  return rv
};
goog.string.contains = function(s, ss) {
  return s.indexOf(ss) != -1
};
goog.string.removeAt = function(s, index, stringLength) {
  var resultStr = s;
  if(index >= 0 && index < s.length && stringLength > 0) {
    resultStr = s.substr(0, index) + s.substr(index + stringLength, s.length - index - stringLength)
  }
  return resultStr
};
goog.string.remove = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "");
  return s.replace(re, "")
};
goog.string.removeAll = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "g");
  return s.replace(re, "")
};
goog.string.regExpEscape = function(s) {
  return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, "\\$1").replace(/\x08/g, "\\x08")
};
goog.string.repeat = function(string, length) {
  return(new Array(length + 1)).join(string)
};
goog.string.padNumber = function(num, length, opt_precision) {
  var s = goog.isDef(opt_precision) ? num.toFixed(opt_precision) : String(num);
  var index = s.indexOf(".");
  if(index == -1) {
    index = s.length
  }
  return goog.string.repeat("0", Math.max(0, length - index)) + s
};
goog.string.makeSafe = function(obj) {
  return obj == null ? "" : String(obj)
};
goog.string.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, "")
};
goog.string.getRandomString = function() {
  var x = 2147483648;
  return Math.floor(Math.random() * x).toString(36) + Math.abs(Math.floor(Math.random() * x) ^ goog.now()).toString(36)
};
goog.string.compareVersions = function(version1, version2) {
  var order = 0;
  var v1Subs = goog.string.trim(String(version1)).split(".");
  var v2Subs = goog.string.trim(String(version2)).split(".");
  var subCount = Math.max(v1Subs.length, v2Subs.length);
  for(var subIdx = 0;order == 0 && subIdx < subCount;subIdx++) {
    var v1Sub = v1Subs[subIdx] || "";
    var v2Sub = v2Subs[subIdx] || "";
    var v1CompParser = new RegExp("(\\d*)(\\D*)", "g");
    var v2CompParser = new RegExp("(\\d*)(\\D*)", "g");
    do {
      var v1Comp = v1CompParser.exec(v1Sub) || ["", "", ""];
      var v2Comp = v2CompParser.exec(v2Sub) || ["", "", ""];
      if(v1Comp[0].length == 0 && v2Comp[0].length == 0) {
        break
      }
      var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
      var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);
      order = goog.string.compareElements_(v1CompNum, v2CompNum) || goog.string.compareElements_(v1Comp[2].length == 0, v2Comp[2].length == 0) || goog.string.compareElements_(v1Comp[2], v2Comp[2])
    }while(order == 0)
  }
  return order
};
goog.string.compareElements_ = function(left, right) {
  if(left < right) {
    return-1
  }else {
    if(left > right) {
      return 1
    }
  }
  return 0
};
goog.string.HASHCODE_MAX_ = 4294967296;
goog.string.hashCode = function(str) {
  var result = 0;
  for(var i = 0;i < str.length;++i) {
    result = 31 * result + str.charCodeAt(i);
    result %= goog.string.HASHCODE_MAX_
  }
  return result
};
goog.string.uniqueStringCounter_ = Math.random() * 2147483648 | 0;
goog.string.createUniqueString = function() {
  return"goog_" + goog.string.uniqueStringCounter_++
};
goog.string.toNumber = function(str) {
  var num = Number(str);
  if(num == 0 && goog.string.isEmpty(str)) {
    return NaN
  }
  return num
};
goog.string.toCamelCaseCache_ = {};
goog.string.toCamelCase = function(str) {
  return goog.string.toCamelCaseCache_[str] || (goog.string.toCamelCaseCache_[str] = String(str).replace(/\-([a-z])/g, function(all, match) {
    return match.toUpperCase()
  }))
};
goog.string.toSelectorCaseCache_ = {};
goog.string.toSelectorCase = function(str) {
  return goog.string.toSelectorCaseCache_[str] || (goog.string.toSelectorCaseCache_[str] = String(str).replace(/([A-Z])/g, "-$1").toLowerCase())
};
goog.provide("goog.asserts");
goog.provide("goog.asserts.AssertionError");
goog.require("goog.debug.Error");
goog.require("goog.string");
goog.asserts.ENABLE_ASSERTS = goog.DEBUG;
goog.asserts.AssertionError = function(messagePattern, messageArgs) {
  messageArgs.unshift(messagePattern);
  goog.debug.Error.call(this, goog.string.subs.apply(null, messageArgs));
  messageArgs.shift();
  this.messagePattern = messagePattern
};
goog.inherits(goog.asserts.AssertionError, goog.debug.Error);
goog.asserts.AssertionError.prototype.name = "AssertionError";
goog.asserts.doAssertFailure_ = function(defaultMessage, defaultArgs, givenMessage, givenArgs) {
  var message = "Assertion failed";
  if(givenMessage) {
    message += ": " + givenMessage;
    var args = givenArgs
  }else {
    if(defaultMessage) {
      message += ": " + defaultMessage;
      args = defaultArgs
    }
  }
  throw new goog.asserts.AssertionError("" + message, args || []);
};
goog.asserts.assert = function(condition, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !condition) {
    goog.asserts.doAssertFailure_("", null, opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return condition
};
goog.asserts.fail = function(opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS) {
    throw new goog.asserts.AssertionError("Failure" + (opt_message ? ": " + opt_message : ""), Array.prototype.slice.call(arguments, 1));
  }
};
goog.asserts.assertNumber = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isNumber(value)) {
    goog.asserts.doAssertFailure_("Expected number but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertString = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isString(value)) {
    goog.asserts.doAssertFailure_("Expected string but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertFunction = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isFunction(value)) {
    goog.asserts.doAssertFailure_("Expected function but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertObject = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isObject(value)) {
    goog.asserts.doAssertFailure_("Expected object but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertArray = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isArray(value)) {
    goog.asserts.doAssertFailure_("Expected array but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertBoolean = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isBoolean(value)) {
    goog.asserts.doAssertFailure_("Expected boolean but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertInstanceof = function(value, type, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !(value instanceof type)) {
    goog.asserts.doAssertFailure_("instanceof check failed.", null, opt_message, Array.prototype.slice.call(arguments, 3))
  }
};
goog.provide("goog.array");
goog.provide("goog.array.ArrayLike");
goog.require("goog.asserts");
goog.NATIVE_ARRAY_PROTOTYPES = true;
goog.array.ArrayLike;
goog.array.peek = function(array) {
  return array[array.length - 1]
};
goog.array.ARRAY_PROTOTYPE_ = Array.prototype;
goog.array.indexOf = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.indexOf ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.indexOf.call(arr, obj, opt_fromIndex)
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? 0 : opt_fromIndex < 0 ? Math.max(0, arr.length + opt_fromIndex) : opt_fromIndex;
  if(goog.isString(arr)) {
    if(!goog.isString(obj) || obj.length != 1) {
      return-1
    }
    return arr.indexOf(obj, fromIndex)
  }
  for(var i = fromIndex;i < arr.length;i++) {
    if(i in arr && arr[i] === obj) {
      return i
    }
  }
  return-1
};
goog.array.lastIndexOf = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.lastIndexOf ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  return goog.array.ARRAY_PROTOTYPE_.lastIndexOf.call(arr, obj, fromIndex)
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  if(fromIndex < 0) {
    fromIndex = Math.max(0, arr.length + fromIndex)
  }
  if(goog.isString(arr)) {
    if(!goog.isString(obj) || obj.length != 1) {
      return-1
    }
    return arr.lastIndexOf(obj, fromIndex)
  }
  for(var i = fromIndex;i >= 0;i--) {
    if(i in arr && arr[i] === obj) {
      return i
    }
  }
  return-1
};
goog.array.forEach = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.forEach ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  goog.array.ARRAY_PROTOTYPE_.forEach.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      f.call(opt_obj, arr2[i], i, arr)
    }
  }
};
goog.array.forEachRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = l - 1;i >= 0;--i) {
    if(i in arr2) {
      f.call(opt_obj, arr2[i], i, arr)
    }
  }
};
goog.array.filter = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.filter ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.filter.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = [];
  var resLength = 0;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      var val = arr2[i];
      if(f.call(opt_obj, val, i, arr)) {
        res[resLength++] = val
      }
    }
  }
  return res
};
goog.array.map = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.map ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.map.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = new Array(l);
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      res[i] = f.call(opt_obj, arr2[i], i, arr)
    }
  }
  return res
};
goog.array.reduce = function(arr, f, val, opt_obj) {
  if(arr.reduce) {
    if(opt_obj) {
      return arr.reduce(goog.bind(f, opt_obj), val)
    }else {
      return arr.reduce(f, val)
    }
  }
  var rval = val;
  goog.array.forEach(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr)
  });
  return rval
};
goog.array.reduceRight = function(arr, f, val, opt_obj) {
  if(arr.reduceRight) {
    if(opt_obj) {
      return arr.reduceRight(goog.bind(f, opt_obj), val)
    }else {
      return arr.reduceRight(f, val)
    }
  }
  var rval = val;
  goog.array.forEachRight(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr)
  });
  return rval
};
goog.array.some = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.some ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.some.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return true
    }
  }
  return false
};
goog.array.every = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.every ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.every.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && !f.call(opt_obj, arr2[i], i, arr)) {
      return false
    }
  }
  return true
};
goog.array.find = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i]
};
goog.array.findIndex = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i
    }
  }
  return-1
};
goog.array.findRight = function(arr, f, opt_obj) {
  var i = goog.array.findIndexRight(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i]
};
goog.array.findIndexRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = l - 1;i >= 0;i--) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i
    }
  }
  return-1
};
goog.array.contains = function(arr, obj) {
  return goog.array.indexOf(arr, obj) >= 0
};
goog.array.isEmpty = function(arr) {
  return arr.length == 0
};
goog.array.clear = function(arr) {
  if(!goog.isArray(arr)) {
    for(var i = arr.length - 1;i >= 0;i--) {
      delete arr[i]
    }
  }
  arr.length = 0
};
goog.array.insert = function(arr, obj) {
  if(!goog.array.contains(arr, obj)) {
    arr.push(obj)
  }
};
goog.array.insertAt = function(arr, obj, opt_i) {
  goog.array.splice(arr, opt_i, 0, obj)
};
goog.array.insertArrayAt = function(arr, elementsToAdd, opt_i) {
  goog.partial(goog.array.splice, arr, opt_i, 0).apply(null, elementsToAdd)
};
goog.array.insertBefore = function(arr, obj, opt_obj2) {
  var i;
  if(arguments.length == 2 || (i = goog.array.indexOf(arr, opt_obj2)) < 0) {
    arr.push(obj)
  }else {
    goog.array.insertAt(arr, obj, i)
  }
};
goog.array.remove = function(arr, obj) {
  var i = goog.array.indexOf(arr, obj);
  var rv;
  if(rv = i >= 0) {
    goog.array.removeAt(arr, i)
  }
  return rv
};
goog.array.removeAt = function(arr, i) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.call(arr, i, 1).length == 1
};
goog.array.removeIf = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  if(i >= 0) {
    goog.array.removeAt(arr, i);
    return true
  }
  return false
};
goog.array.concat = function(var_args) {
  return goog.array.ARRAY_PROTOTYPE_.concat.apply(goog.array.ARRAY_PROTOTYPE_, arguments)
};
goog.array.clone = function(arr) {
  if(goog.isArray(arr)) {
    return goog.array.concat(arr)
  }else {
    var rv = [];
    for(var i = 0, len = arr.length;i < len;i++) {
      rv[i] = arr[i]
    }
    return rv
  }
};
goog.array.toArray = function(object) {
  if(goog.isArray(object)) {
    return goog.array.concat(object)
  }
  return goog.array.clone(object)
};
goog.array.extend = function(arr1, var_args) {
  for(var i = 1;i < arguments.length;i++) {
    var arr2 = arguments[i];
    var isArrayLike;
    if(goog.isArray(arr2) || (isArrayLike = goog.isArrayLike(arr2)) && arr2.hasOwnProperty("callee")) {
      arr1.push.apply(arr1, arr2)
    }else {
      if(isArrayLike) {
        var len1 = arr1.length;
        var len2 = arr2.length;
        for(var j = 0;j < len2;j++) {
          arr1[len1 + j] = arr2[j]
        }
      }else {
        arr1.push(arr2)
      }
    }
  }
};
goog.array.splice = function(arr, index, howMany, var_args) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.apply(arr, goog.array.slice(arguments, 1))
};
goog.array.slice = function(arr, start, opt_end) {
  goog.asserts.assert(arr.length != null);
  if(arguments.length <= 2) {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start)
  }else {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start, opt_end)
  }
};
goog.array.removeDuplicates = function(arr, opt_rv) {
  var returnArray = opt_rv || arr;
  var seen = {}, cursorInsert = 0, cursorRead = 0;
  while(cursorRead < arr.length) {
    var current = arr[cursorRead++];
    var key = goog.isObject(current) ? "o" + goog.getUid(current) : (typeof current).charAt(0) + current;
    if(!Object.prototype.hasOwnProperty.call(seen, key)) {
      seen[key] = true;
      returnArray[cursorInsert++] = current
    }
  }
  returnArray.length = cursorInsert
};
goog.array.binarySearch = function(arr, target, opt_compareFn) {
  return goog.array.binarySearch_(arr, opt_compareFn || goog.array.defaultCompare, false, target)
};
goog.array.binarySelect = function(arr, evaluator, opt_obj) {
  return goog.array.binarySearch_(arr, evaluator, true, undefined, opt_obj)
};
goog.array.binarySearch_ = function(arr, compareFn, isEvaluator, opt_target, opt_selfObj) {
  var left = 0;
  var right = arr.length;
  var found;
  while(left < right) {
    var middle = left + right >> 1;
    var compareResult;
    if(isEvaluator) {
      compareResult = compareFn.call(opt_selfObj, arr[middle], middle, arr)
    }else {
      compareResult = compareFn(opt_target, arr[middle])
    }
    if(compareResult > 0) {
      left = middle + 1
    }else {
      right = middle;
      found = !compareResult
    }
  }
  return found ? left : ~left
};
goog.array.sort = function(arr, opt_compareFn) {
  goog.asserts.assert(arr.length != null);
  goog.array.ARRAY_PROTOTYPE_.sort.call(arr, opt_compareFn || goog.array.defaultCompare)
};
goog.array.stableSort = function(arr, opt_compareFn) {
  for(var i = 0;i < arr.length;i++) {
    arr[i] = {index:i, value:arr[i]}
  }
  var valueCompareFn = opt_compareFn || goog.array.defaultCompare;
  function stableCompareFn(obj1, obj2) {
    return valueCompareFn(obj1.value, obj2.value) || obj1.index - obj2.index
  }
  goog.array.sort(arr, stableCompareFn);
  for(var i = 0;i < arr.length;i++) {
    arr[i] = arr[i].value
  }
};
goog.array.sortObjectsByKey = function(arr, key, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  goog.array.sort(arr, function(a, b) {
    return compare(a[key], b[key])
  })
};
goog.array.isSorted = function(arr, opt_compareFn, opt_strict) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  for(var i = 1;i < arr.length;i++) {
    var compareResult = compare(arr[i - 1], arr[i]);
    if(compareResult > 0 || compareResult == 0 && opt_strict) {
      return false
    }
  }
  return true
};
goog.array.equals = function(arr1, arr2, opt_equalsFn) {
  if(!goog.isArrayLike(arr1) || !goog.isArrayLike(arr2) || arr1.length != arr2.length) {
    return false
  }
  var l = arr1.length;
  var equalsFn = opt_equalsFn || goog.array.defaultCompareEquality;
  for(var i = 0;i < l;i++) {
    if(!equalsFn(arr1[i], arr2[i])) {
      return false
    }
  }
  return true
};
goog.array.compare = function(arr1, arr2, opt_equalsFn) {
  return goog.array.equals(arr1, arr2, opt_equalsFn)
};
goog.array.compare3 = function(arr1, arr2, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  var l = Math.min(arr1.length, arr2.length);
  for(var i = 0;i < l;i++) {
    var result = compare(arr1[i], arr2[i]);
    if(result != 0) {
      return result
    }
  }
  return goog.array.defaultCompare(arr1.length, arr2.length)
};
goog.array.defaultCompare = function(a, b) {
  return a > b ? 1 : a < b ? -1 : 0
};
goog.array.defaultCompareEquality = function(a, b) {
  return a === b
};
goog.array.binaryInsert = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  if(index < 0) {
    goog.array.insertAt(array, value, -(index + 1));
    return true
  }
  return false
};
goog.array.binaryRemove = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  return index >= 0 ? goog.array.removeAt(array, index) : false
};
goog.array.bucket = function(array, sorter) {
  var buckets = {};
  for(var i = 0;i < array.length;i++) {
    var value = array[i];
    var key = sorter(value, i, array);
    if(goog.isDef(key)) {
      var bucket = buckets[key] || (buckets[key] = []);
      bucket.push(value)
    }
  }
  return buckets
};
goog.array.repeat = function(value, n) {
  var array = [];
  for(var i = 0;i < n;i++) {
    array[i] = value
  }
  return array
};
goog.array.flatten = function(var_args) {
  var result = [];
  for(var i = 0;i < arguments.length;i++) {
    var element = arguments[i];
    if(goog.isArray(element)) {
      result.push.apply(result, goog.array.flatten.apply(null, element))
    }else {
      result.push(element)
    }
  }
  return result
};
goog.array.rotate = function(array, n) {
  goog.asserts.assert(array.length != null);
  if(array.length) {
    n %= array.length;
    if(n > 0) {
      goog.array.ARRAY_PROTOTYPE_.unshift.apply(array, array.splice(-n, n))
    }else {
      if(n < 0) {
        goog.array.ARRAY_PROTOTYPE_.push.apply(array, array.splice(0, -n))
      }
    }
  }
  return array
};
goog.array.zip = function(var_args) {
  if(!arguments.length) {
    return[]
  }
  var result = [];
  for(var i = 0;true;i++) {
    var value = [];
    for(var j = 0;j < arguments.length;j++) {
      var arr = arguments[j];
      if(i >= arr.length) {
        return result
      }
      value.push(arr[i])
    }
    result.push(value)
  }
};
goog.array.shuffle = function(arr, opt_randFn) {
  var randFn = opt_randFn || Math.random;
  for(var i = arr.length - 1;i > 0;i--) {
    var j = Math.floor(randFn() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp
  }
};
goog.provide("goog.object");
goog.object.forEach = function(obj, f, opt_obj) {
  for(var key in obj) {
    f.call(opt_obj, obj[key], key, obj)
  }
};
goog.object.filter = function(obj, f, opt_obj) {
  var res = {};
  for(var key in obj) {
    if(f.call(opt_obj, obj[key], key, obj)) {
      res[key] = obj[key]
    }
  }
  return res
};
goog.object.map = function(obj, f, opt_obj) {
  var res = {};
  for(var key in obj) {
    res[key] = f.call(opt_obj, obj[key], key, obj)
  }
  return res
};
goog.object.some = function(obj, f, opt_obj) {
  for(var key in obj) {
    if(f.call(opt_obj, obj[key], key, obj)) {
      return true
    }
  }
  return false
};
goog.object.every = function(obj, f, opt_obj) {
  for(var key in obj) {
    if(!f.call(opt_obj, obj[key], key, obj)) {
      return false
    }
  }
  return true
};
goog.object.getCount = function(obj) {
  var rv = 0;
  for(var key in obj) {
    rv++
  }
  return rv
};
goog.object.getAnyKey = function(obj) {
  for(var key in obj) {
    return key
  }
};
goog.object.getAnyValue = function(obj) {
  for(var key in obj) {
    return obj[key]
  }
};
goog.object.contains = function(obj, val) {
  return goog.object.containsValue(obj, val)
};
goog.object.getValues = function(obj) {
  var res = [];
  var i = 0;
  for(var key in obj) {
    res[i++] = obj[key]
  }
  return res
};
goog.object.getKeys = function(obj) {
  var res = [];
  var i = 0;
  for(var key in obj) {
    res[i++] = key
  }
  return res
};
goog.object.getValueByKeys = function(obj, var_args) {
  var isArrayLike = goog.isArrayLike(var_args);
  var keys = isArrayLike ? var_args : arguments;
  for(var i = isArrayLike ? 0 : 1;i < keys.length;i++) {
    obj = obj[keys[i]];
    if(!goog.isDef(obj)) {
      break
    }
  }
  return obj
};
goog.object.containsKey = function(obj, key) {
  return key in obj
};
goog.object.containsValue = function(obj, val) {
  for(var key in obj) {
    if(obj[key] == val) {
      return true
    }
  }
  return false
};
goog.object.findKey = function(obj, f, opt_this) {
  for(var key in obj) {
    if(f.call(opt_this, obj[key], key, obj)) {
      return key
    }
  }
  return undefined
};
goog.object.findValue = function(obj, f, opt_this) {
  var key = goog.object.findKey(obj, f, opt_this);
  return key && obj[key]
};
goog.object.isEmpty = function(obj) {
  for(var key in obj) {
    return false
  }
  return true
};
goog.object.clear = function(obj) {
  for(var i in obj) {
    delete obj[i]
  }
};
goog.object.remove = function(obj, key) {
  var rv;
  if(rv = key in obj) {
    delete obj[key]
  }
  return rv
};
goog.object.add = function(obj, key, val) {
  if(key in obj) {
    throw Error('The object already contains the key "' + key + '"');
  }
  goog.object.set(obj, key, val)
};
goog.object.get = function(obj, key, opt_val) {
  if(key in obj) {
    return obj[key]
  }
  return opt_val
};
goog.object.set = function(obj, key, value) {
  obj[key] = value
};
goog.object.setIfUndefined = function(obj, key, value) {
  return key in obj ? obj[key] : obj[key] = value
};
goog.object.clone = function(obj) {
  var res = {};
  for(var key in obj) {
    res[key] = obj[key]
  }
  return res
};
goog.object.unsafeClone = function(obj) {
  var type = goog.typeOf(obj);
  if(type == "object" || type == "array") {
    if(obj.clone) {
      return obj.clone()
    }
    var clone = type == "array" ? [] : {};
    for(var key in obj) {
      clone[key] = goog.object.unsafeClone(obj[key])
    }
    return clone
  }
  return obj
};
goog.object.transpose = function(obj) {
  var transposed = {};
  for(var key in obj) {
    transposed[obj[key]] = key
  }
  return transposed
};
goog.object.PROTOTYPE_FIELDS_ = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"];
goog.object.extend = function(target, var_args) {
  var key, source;
  for(var i = 1;i < arguments.length;i++) {
    source = arguments[i];
    for(key in source) {
      target[key] = source[key]
    }
    for(var j = 0;j < goog.object.PROTOTYPE_FIELDS_.length;j++) {
      key = goog.object.PROTOTYPE_FIELDS_[j];
      if(Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key]
      }
    }
  }
};
goog.object.create = function(var_args) {
  var argLength = arguments.length;
  if(argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.create.apply(null, arguments[0])
  }
  if(argLength % 2) {
    throw Error("Uneven number of arguments");
  }
  var rv = {};
  for(var i = 0;i < argLength;i += 2) {
    rv[arguments[i]] = arguments[i + 1]
  }
  return rv
};
goog.object.createSet = function(var_args) {
  var argLength = arguments.length;
  if(argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.createSet.apply(null, arguments[0])
  }
  var rv = {};
  for(var i = 0;i < argLength;i++) {
    rv[arguments[i]] = true
  }
  return rv
};
goog.provide("goog.string.format");
goog.require("goog.string");
goog.string.format = function(formatString, var_args) {
  var args = Array.prototype.slice.call(arguments);
  var template = args.shift();
  if(typeof template == "undefined") {
    throw Error("[goog.string.format] Template required");
  }
  var formatRe = /%([0\-\ \+]*)(\d+)?(\.(\d+))?([%sfdiu])/g;
  function replacerDemuxer(match, flags, width, dotp, precision, type, offset, wholeString) {
    if(type == "%") {
      return"%"
    }
    var value = args.shift();
    if(typeof value == "undefined") {
      throw Error("[goog.string.format] Not enough arguments");
    }
    arguments[0] = value;
    return goog.string.format.demuxes_[type].apply(null, arguments)
  }
  return template.replace(formatRe, replacerDemuxer)
};
goog.string.format.demuxes_ = {};
goog.string.format.demuxes_["s"] = function(value, flags, width, dotp, precision, type, offset, wholeString) {
  var replacement = value;
  if(isNaN(width) || width == "" || replacement.length >= width) {
    return replacement
  }
  if(flags.indexOf("-", 0) > -1) {
    replacement = replacement + goog.string.repeat(" ", width - replacement.length)
  }else {
    replacement = goog.string.repeat(" ", width - replacement.length) + replacement
  }
  return replacement
};
goog.string.format.demuxes_["f"] = function(value, flags, width, dotp, precision, type, offset, wholeString) {
  var replacement = value.toString();
  if(!(isNaN(precision) || precision == "")) {
    replacement = value.toFixed(precision)
  }
  var sign;
  if(value < 0) {
    sign = "-"
  }else {
    if(flags.indexOf("+") >= 0) {
      sign = "+"
    }else {
      if(flags.indexOf(" ") >= 0) {
        sign = " "
      }else {
        sign = ""
      }
    }
  }
  if(value >= 0) {
    replacement = sign + replacement
  }
  if(isNaN(width) || replacement.length >= width) {
    return replacement
  }
  replacement = isNaN(precision) ? Math.abs(value).toString() : Math.abs(value).toFixed(precision);
  var padCount = width - replacement.length - sign.length;
  if(flags.indexOf("-", 0) >= 0) {
    replacement = sign + replacement + goog.string.repeat(" ", padCount)
  }else {
    var paddingChar = flags.indexOf("0", 0) >= 0 ? "0" : " ";
    replacement = sign + goog.string.repeat(paddingChar, padCount) + replacement
  }
  return replacement
};
goog.string.format.demuxes_["d"] = function(value, flags, width, dotp, precision, type, offset, wholeString) {
  return goog.string.format.demuxes_["f"](parseInt(value, 10), flags, width, dotp, 0, type, offset, wholeString)
};
goog.string.format.demuxes_["i"] = goog.string.format.demuxes_["d"];
goog.string.format.demuxes_["u"] = goog.string.format.demuxes_["d"];
goog.provide("goog.userAgent.jscript");
goog.require("goog.string");
goog.userAgent.jscript.ASSUME_NO_JSCRIPT = false;
goog.userAgent.jscript.init_ = function() {
  var hasScriptEngine = "ScriptEngine" in goog.global;
  goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_ = hasScriptEngine && goog.global["ScriptEngine"]() == "JScript";
  goog.userAgent.jscript.DETECTED_VERSION_ = goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_ ? goog.global["ScriptEngineMajorVersion"]() + "." + goog.global["ScriptEngineMinorVersion"]() + "." + goog.global["ScriptEngineBuildVersion"]() : "0"
};
if(!goog.userAgent.jscript.ASSUME_NO_JSCRIPT) {
  goog.userAgent.jscript.init_()
}
goog.userAgent.jscript.HAS_JSCRIPT = goog.userAgent.jscript.ASSUME_NO_JSCRIPT ? false : goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_;
goog.userAgent.jscript.VERSION = goog.userAgent.jscript.ASSUME_NO_JSCRIPT ? "0" : goog.userAgent.jscript.DETECTED_VERSION_;
goog.userAgent.jscript.isVersion = function(version) {
  return goog.string.compareVersions(goog.userAgent.jscript.VERSION, version) >= 0
};
goog.provide("goog.string.StringBuffer");
goog.require("goog.userAgent.jscript");
goog.string.StringBuffer = function(opt_a1, var_args) {
  this.buffer_ = goog.userAgent.jscript.HAS_JSCRIPT ? [] : "";
  if(opt_a1 != null) {
    this.append.apply(this, arguments)
  }
};
goog.string.StringBuffer.prototype.set = function(s) {
  this.clear();
  this.append(s)
};
if(goog.userAgent.jscript.HAS_JSCRIPT) {
  goog.string.StringBuffer.prototype.bufferLength_ = 0;
  goog.string.StringBuffer.prototype.append = function(a1, opt_a2, var_args) {
    if(opt_a2 == null) {
      this.buffer_[this.bufferLength_++] = a1
    }else {
      this.buffer_.push.apply(this.buffer_, arguments);
      this.bufferLength_ = this.buffer_.length
    }
    return this
  }
}else {
  goog.string.StringBuffer.prototype.append = function(a1, opt_a2, var_args) {
    this.buffer_ += a1;
    if(opt_a2 != null) {
      for(var i = 1;i < arguments.length;i++) {
        this.buffer_ += arguments[i]
      }
    }
    return this
  }
}
goog.string.StringBuffer.prototype.clear = function() {
  if(goog.userAgent.jscript.HAS_JSCRIPT) {
    this.buffer_.length = 0;
    this.bufferLength_ = 0
  }else {
    this.buffer_ = ""
  }
};
goog.string.StringBuffer.prototype.getLength = function() {
  return this.toString().length
};
goog.string.StringBuffer.prototype.toString = function() {
  if(goog.userAgent.jscript.HAS_JSCRIPT) {
    var str = this.buffer_.join("");
    this.clear();
    if(str) {
      this.append(str)
    }
    return str
  }else {
    return this.buffer_
  }
};
goog.provide("cljs.core");
goog.require("goog.array");
goog.require("goog.object");
goog.require("goog.string.format");
goog.require("goog.string.StringBuffer");
goog.require("goog.string");
cljs.core._STAR_unchecked_if_STAR_ = false;
cljs.core._STAR_print_fn_STAR_ = function _STAR_print_fn_STAR_(_) {
  throw new Error("No *print-fn* fn set for evaluation environment");
};
cljs.core.truth_ = function truth_(x) {
  return x != null && x !== false
};
cljs.core.type_satisfies_ = function type_satisfies_(p, x) {
  var x__6682 = x == null ? null : x;
  if(p[goog.typeOf(x__6682)]) {
    return true
  }else {
    if(p["_"]) {
      return true
    }else {
      if("\ufdd0'else") {
        return false
      }else {
        return null
      }
    }
  }
};
cljs.core.is_proto_ = function is_proto_(x) {
  return x.constructor.prototype === x
};
cljs.core._STAR_main_cli_fn_STAR_ = null;
cljs.core.missing_protocol = function missing_protocol(proto, obj) {
  return Error(["No protocol method ", proto, " defined for type ", goog.typeOf(obj), ": ", obj].join(""))
};
cljs.core.aclone = function aclone(array_like) {
  return array_like.slice()
};
cljs.core.array = function array(var_args) {
  return Array.prototype.slice.call(arguments)
};
cljs.core.make_array = function() {
  var make_array = null;
  var make_array__1 = function(size) {
    return new Array(size)
  };
  var make_array__2 = function(type, size) {
    return make_array.call(null, size)
  };
  make_array = function(type, size) {
    switch(arguments.length) {
      case 1:
        return make_array__1.call(this, type);
      case 2:
        return make_array__2.call(this, type, size)
    }
    throw"Invalid arity: " + arguments.length;
  };
  make_array.cljs$lang$arity$1 = make_array__1;
  make_array.cljs$lang$arity$2 = make_array__2;
  return make_array
}();
cljs.core.aget = function() {
  var aget = null;
  var aget__2 = function(array, i) {
    return array[i]
  };
  var aget__3 = function() {
    var G__6683__delegate = function(array, i, idxs) {
      return cljs.core.apply.call(null, aget, aget.call(null, array, i), idxs)
    };
    var G__6683 = function(array, i, var_args) {
      var idxs = null;
      if(goog.isDef(var_args)) {
        idxs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__6683__delegate.call(this, array, i, idxs)
    };
    G__6683.cljs$lang$maxFixedArity = 2;
    G__6683.cljs$lang$applyTo = function(arglist__6684) {
      var array = cljs.core.first(arglist__6684);
      var i = cljs.core.first(cljs.core.next(arglist__6684));
      var idxs = cljs.core.rest(cljs.core.next(arglist__6684));
      return G__6683__delegate(array, i, idxs)
    };
    G__6683.cljs$lang$arity$variadic = G__6683__delegate;
    return G__6683
  }();
  aget = function(array, i, var_args) {
    var idxs = var_args;
    switch(arguments.length) {
      case 2:
        return aget__2.call(this, array, i);
      default:
        return aget__3.cljs$lang$arity$variadic(array, i, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  aget.cljs$lang$maxFixedArity = 2;
  aget.cljs$lang$applyTo = aget__3.cljs$lang$applyTo;
  aget.cljs$lang$arity$2 = aget__2;
  aget.cljs$lang$arity$variadic = aget__3.cljs$lang$arity$variadic;
  return aget
}();
cljs.core.aset = function aset(array, i, val) {
  return array[i] = val
};
cljs.core.alength = function alength(array) {
  return array.length
};
cljs.core.into_array = function() {
  var into_array = null;
  var into_array__1 = function(aseq) {
    return into_array.call(null, null, aseq)
  };
  var into_array__2 = function(type, aseq) {
    return cljs.core.reduce.call(null, function(a, x) {
      a.push(x);
      return a
    }, [], aseq)
  };
  into_array = function(type, aseq) {
    switch(arguments.length) {
      case 1:
        return into_array__1.call(this, type);
      case 2:
        return into_array__2.call(this, type, aseq)
    }
    throw"Invalid arity: " + arguments.length;
  };
  into_array.cljs$lang$arity$1 = into_array__1;
  into_array.cljs$lang$arity$2 = into_array__2;
  return into_array
}();
cljs.core.IFn = {};
cljs.core._invoke = function() {
  var _invoke = null;
  var _invoke__1 = function(this$) {
    if(function() {
      var and__3822__auto____6769 = this$;
      if(and__3822__auto____6769) {
        return this$.cljs$core$IFn$_invoke$arity$1
      }else {
        return and__3822__auto____6769
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$1(this$)
    }else {
      var x__2359__auto____6770 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6771 = cljs.core._invoke[goog.typeOf(x__2359__auto____6770)];
        if(or__3824__auto____6771) {
          return or__3824__auto____6771
        }else {
          var or__3824__auto____6772 = cljs.core._invoke["_"];
          if(or__3824__auto____6772) {
            return or__3824__auto____6772
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$)
    }
  };
  var _invoke__2 = function(this$, a) {
    if(function() {
      var and__3822__auto____6773 = this$;
      if(and__3822__auto____6773) {
        return this$.cljs$core$IFn$_invoke$arity$2
      }else {
        return and__3822__auto____6773
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$2(this$, a)
    }else {
      var x__2359__auto____6774 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6775 = cljs.core._invoke[goog.typeOf(x__2359__auto____6774)];
        if(or__3824__auto____6775) {
          return or__3824__auto____6775
        }else {
          var or__3824__auto____6776 = cljs.core._invoke["_"];
          if(or__3824__auto____6776) {
            return or__3824__auto____6776
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a)
    }
  };
  var _invoke__3 = function(this$, a, b) {
    if(function() {
      var and__3822__auto____6777 = this$;
      if(and__3822__auto____6777) {
        return this$.cljs$core$IFn$_invoke$arity$3
      }else {
        return and__3822__auto____6777
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$3(this$, a, b)
    }else {
      var x__2359__auto____6778 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6779 = cljs.core._invoke[goog.typeOf(x__2359__auto____6778)];
        if(or__3824__auto____6779) {
          return or__3824__auto____6779
        }else {
          var or__3824__auto____6780 = cljs.core._invoke["_"];
          if(or__3824__auto____6780) {
            return or__3824__auto____6780
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b)
    }
  };
  var _invoke__4 = function(this$, a, b, c) {
    if(function() {
      var and__3822__auto____6781 = this$;
      if(and__3822__auto____6781) {
        return this$.cljs$core$IFn$_invoke$arity$4
      }else {
        return and__3822__auto____6781
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$4(this$, a, b, c)
    }else {
      var x__2359__auto____6782 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6783 = cljs.core._invoke[goog.typeOf(x__2359__auto____6782)];
        if(or__3824__auto____6783) {
          return or__3824__auto____6783
        }else {
          var or__3824__auto____6784 = cljs.core._invoke["_"];
          if(or__3824__auto____6784) {
            return or__3824__auto____6784
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c)
    }
  };
  var _invoke__5 = function(this$, a, b, c, d) {
    if(function() {
      var and__3822__auto____6785 = this$;
      if(and__3822__auto____6785) {
        return this$.cljs$core$IFn$_invoke$arity$5
      }else {
        return and__3822__auto____6785
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$5(this$, a, b, c, d)
    }else {
      var x__2359__auto____6786 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6787 = cljs.core._invoke[goog.typeOf(x__2359__auto____6786)];
        if(or__3824__auto____6787) {
          return or__3824__auto____6787
        }else {
          var or__3824__auto____6788 = cljs.core._invoke["_"];
          if(or__3824__auto____6788) {
            return or__3824__auto____6788
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d)
    }
  };
  var _invoke__6 = function(this$, a, b, c, d, e) {
    if(function() {
      var and__3822__auto____6789 = this$;
      if(and__3822__auto____6789) {
        return this$.cljs$core$IFn$_invoke$arity$6
      }else {
        return and__3822__auto____6789
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$6(this$, a, b, c, d, e)
    }else {
      var x__2359__auto____6790 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6791 = cljs.core._invoke[goog.typeOf(x__2359__auto____6790)];
        if(or__3824__auto____6791) {
          return or__3824__auto____6791
        }else {
          var or__3824__auto____6792 = cljs.core._invoke["_"];
          if(or__3824__auto____6792) {
            return or__3824__auto____6792
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e)
    }
  };
  var _invoke__7 = function(this$, a, b, c, d, e, f) {
    if(function() {
      var and__3822__auto____6793 = this$;
      if(and__3822__auto____6793) {
        return this$.cljs$core$IFn$_invoke$arity$7
      }else {
        return and__3822__auto____6793
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$7(this$, a, b, c, d, e, f)
    }else {
      var x__2359__auto____6794 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6795 = cljs.core._invoke[goog.typeOf(x__2359__auto____6794)];
        if(or__3824__auto____6795) {
          return or__3824__auto____6795
        }else {
          var or__3824__auto____6796 = cljs.core._invoke["_"];
          if(or__3824__auto____6796) {
            return or__3824__auto____6796
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f)
    }
  };
  var _invoke__8 = function(this$, a, b, c, d, e, f, g) {
    if(function() {
      var and__3822__auto____6797 = this$;
      if(and__3822__auto____6797) {
        return this$.cljs$core$IFn$_invoke$arity$8
      }else {
        return and__3822__auto____6797
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$8(this$, a, b, c, d, e, f, g)
    }else {
      var x__2359__auto____6798 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6799 = cljs.core._invoke[goog.typeOf(x__2359__auto____6798)];
        if(or__3824__auto____6799) {
          return or__3824__auto____6799
        }else {
          var or__3824__auto____6800 = cljs.core._invoke["_"];
          if(or__3824__auto____6800) {
            return or__3824__auto____6800
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g)
    }
  };
  var _invoke__9 = function(this$, a, b, c, d, e, f, g, h) {
    if(function() {
      var and__3822__auto____6801 = this$;
      if(and__3822__auto____6801) {
        return this$.cljs$core$IFn$_invoke$arity$9
      }else {
        return and__3822__auto____6801
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$9(this$, a, b, c, d, e, f, g, h)
    }else {
      var x__2359__auto____6802 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6803 = cljs.core._invoke[goog.typeOf(x__2359__auto____6802)];
        if(or__3824__auto____6803) {
          return or__3824__auto____6803
        }else {
          var or__3824__auto____6804 = cljs.core._invoke["_"];
          if(or__3824__auto____6804) {
            return or__3824__auto____6804
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h)
    }
  };
  var _invoke__10 = function(this$, a, b, c, d, e, f, g, h, i) {
    if(function() {
      var and__3822__auto____6805 = this$;
      if(and__3822__auto____6805) {
        return this$.cljs$core$IFn$_invoke$arity$10
      }else {
        return and__3822__auto____6805
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$10(this$, a, b, c, d, e, f, g, h, i)
    }else {
      var x__2359__auto____6806 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6807 = cljs.core._invoke[goog.typeOf(x__2359__auto____6806)];
        if(or__3824__auto____6807) {
          return or__3824__auto____6807
        }else {
          var or__3824__auto____6808 = cljs.core._invoke["_"];
          if(or__3824__auto____6808) {
            return or__3824__auto____6808
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i)
    }
  };
  var _invoke__11 = function(this$, a, b, c, d, e, f, g, h, i, j) {
    if(function() {
      var and__3822__auto____6809 = this$;
      if(and__3822__auto____6809) {
        return this$.cljs$core$IFn$_invoke$arity$11
      }else {
        return and__3822__auto____6809
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$11(this$, a, b, c, d, e, f, g, h, i, j)
    }else {
      var x__2359__auto____6810 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6811 = cljs.core._invoke[goog.typeOf(x__2359__auto____6810)];
        if(or__3824__auto____6811) {
          return or__3824__auto____6811
        }else {
          var or__3824__auto____6812 = cljs.core._invoke["_"];
          if(or__3824__auto____6812) {
            return or__3824__auto____6812
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j)
    }
  };
  var _invoke__12 = function(this$, a, b, c, d, e, f, g, h, i, j, k) {
    if(function() {
      var and__3822__auto____6813 = this$;
      if(and__3822__auto____6813) {
        return this$.cljs$core$IFn$_invoke$arity$12
      }else {
        return and__3822__auto____6813
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$12(this$, a, b, c, d, e, f, g, h, i, j, k)
    }else {
      var x__2359__auto____6814 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6815 = cljs.core._invoke[goog.typeOf(x__2359__auto____6814)];
        if(or__3824__auto____6815) {
          return or__3824__auto____6815
        }else {
          var or__3824__auto____6816 = cljs.core._invoke["_"];
          if(or__3824__auto____6816) {
            return or__3824__auto____6816
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k)
    }
  };
  var _invoke__13 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l) {
    if(function() {
      var and__3822__auto____6817 = this$;
      if(and__3822__auto____6817) {
        return this$.cljs$core$IFn$_invoke$arity$13
      }else {
        return and__3822__auto____6817
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$13(this$, a, b, c, d, e, f, g, h, i, j, k, l)
    }else {
      var x__2359__auto____6818 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6819 = cljs.core._invoke[goog.typeOf(x__2359__auto____6818)];
        if(or__3824__auto____6819) {
          return or__3824__auto____6819
        }else {
          var or__3824__auto____6820 = cljs.core._invoke["_"];
          if(or__3824__auto____6820) {
            return or__3824__auto____6820
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l)
    }
  };
  var _invoke__14 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m) {
    if(function() {
      var and__3822__auto____6821 = this$;
      if(and__3822__auto____6821) {
        return this$.cljs$core$IFn$_invoke$arity$14
      }else {
        return and__3822__auto____6821
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$14(this$, a, b, c, d, e, f, g, h, i, j, k, l, m)
    }else {
      var x__2359__auto____6822 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6823 = cljs.core._invoke[goog.typeOf(x__2359__auto____6822)];
        if(or__3824__auto____6823) {
          return or__3824__auto____6823
        }else {
          var or__3824__auto____6824 = cljs.core._invoke["_"];
          if(or__3824__auto____6824) {
            return or__3824__auto____6824
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m)
    }
  };
  var _invoke__15 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n) {
    if(function() {
      var and__3822__auto____6825 = this$;
      if(and__3822__auto____6825) {
        return this$.cljs$core$IFn$_invoke$arity$15
      }else {
        return and__3822__auto____6825
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$15(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n)
    }else {
      var x__2359__auto____6826 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6827 = cljs.core._invoke[goog.typeOf(x__2359__auto____6826)];
        if(or__3824__auto____6827) {
          return or__3824__auto____6827
        }else {
          var or__3824__auto____6828 = cljs.core._invoke["_"];
          if(or__3824__auto____6828) {
            return or__3824__auto____6828
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n)
    }
  };
  var _invoke__16 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o) {
    if(function() {
      var and__3822__auto____6829 = this$;
      if(and__3822__auto____6829) {
        return this$.cljs$core$IFn$_invoke$arity$16
      }else {
        return and__3822__auto____6829
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$16(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o)
    }else {
      var x__2359__auto____6830 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6831 = cljs.core._invoke[goog.typeOf(x__2359__auto____6830)];
        if(or__3824__auto____6831) {
          return or__3824__auto____6831
        }else {
          var or__3824__auto____6832 = cljs.core._invoke["_"];
          if(or__3824__auto____6832) {
            return or__3824__auto____6832
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o)
    }
  };
  var _invoke__17 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p) {
    if(function() {
      var and__3822__auto____6833 = this$;
      if(and__3822__auto____6833) {
        return this$.cljs$core$IFn$_invoke$arity$17
      }else {
        return and__3822__auto____6833
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$17(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p)
    }else {
      var x__2359__auto____6834 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6835 = cljs.core._invoke[goog.typeOf(x__2359__auto____6834)];
        if(or__3824__auto____6835) {
          return or__3824__auto____6835
        }else {
          var or__3824__auto____6836 = cljs.core._invoke["_"];
          if(or__3824__auto____6836) {
            return or__3824__auto____6836
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p)
    }
  };
  var _invoke__18 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q) {
    if(function() {
      var and__3822__auto____6837 = this$;
      if(and__3822__auto____6837) {
        return this$.cljs$core$IFn$_invoke$arity$18
      }else {
        return and__3822__auto____6837
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$18(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q)
    }else {
      var x__2359__auto____6838 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6839 = cljs.core._invoke[goog.typeOf(x__2359__auto____6838)];
        if(or__3824__auto____6839) {
          return or__3824__auto____6839
        }else {
          var or__3824__auto____6840 = cljs.core._invoke["_"];
          if(or__3824__auto____6840) {
            return or__3824__auto____6840
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q)
    }
  };
  var _invoke__19 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s) {
    if(function() {
      var and__3822__auto____6841 = this$;
      if(and__3822__auto____6841) {
        return this$.cljs$core$IFn$_invoke$arity$19
      }else {
        return and__3822__auto____6841
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$19(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s)
    }else {
      var x__2359__auto____6842 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6843 = cljs.core._invoke[goog.typeOf(x__2359__auto____6842)];
        if(or__3824__auto____6843) {
          return or__3824__auto____6843
        }else {
          var or__3824__auto____6844 = cljs.core._invoke["_"];
          if(or__3824__auto____6844) {
            return or__3824__auto____6844
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s)
    }
  };
  var _invoke__20 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t) {
    if(function() {
      var and__3822__auto____6845 = this$;
      if(and__3822__auto____6845) {
        return this$.cljs$core$IFn$_invoke$arity$20
      }else {
        return and__3822__auto____6845
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$20(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t)
    }else {
      var x__2359__auto____6846 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6847 = cljs.core._invoke[goog.typeOf(x__2359__auto____6846)];
        if(or__3824__auto____6847) {
          return or__3824__auto____6847
        }else {
          var or__3824__auto____6848 = cljs.core._invoke["_"];
          if(or__3824__auto____6848) {
            return or__3824__auto____6848
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t)
    }
  };
  var _invoke__21 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest) {
    if(function() {
      var and__3822__auto____6849 = this$;
      if(and__3822__auto____6849) {
        return this$.cljs$core$IFn$_invoke$arity$21
      }else {
        return and__3822__auto____6849
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$21(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest)
    }else {
      var x__2359__auto____6850 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6851 = cljs.core._invoke[goog.typeOf(x__2359__auto____6850)];
        if(or__3824__auto____6851) {
          return or__3824__auto____6851
        }else {
          var or__3824__auto____6852 = cljs.core._invoke["_"];
          if(or__3824__auto____6852) {
            return or__3824__auto____6852
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest)
    }
  };
  _invoke = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest) {
    switch(arguments.length) {
      case 1:
        return _invoke__1.call(this, this$);
      case 2:
        return _invoke__2.call(this, this$, a);
      case 3:
        return _invoke__3.call(this, this$, a, b);
      case 4:
        return _invoke__4.call(this, this$, a, b, c);
      case 5:
        return _invoke__5.call(this, this$, a, b, c, d);
      case 6:
        return _invoke__6.call(this, this$, a, b, c, d, e);
      case 7:
        return _invoke__7.call(this, this$, a, b, c, d, e, f);
      case 8:
        return _invoke__8.call(this, this$, a, b, c, d, e, f, g);
      case 9:
        return _invoke__9.call(this, this$, a, b, c, d, e, f, g, h);
      case 10:
        return _invoke__10.call(this, this$, a, b, c, d, e, f, g, h, i);
      case 11:
        return _invoke__11.call(this, this$, a, b, c, d, e, f, g, h, i, j);
      case 12:
        return _invoke__12.call(this, this$, a, b, c, d, e, f, g, h, i, j, k);
      case 13:
        return _invoke__13.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l);
      case 14:
        return _invoke__14.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m);
      case 15:
        return _invoke__15.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n);
      case 16:
        return _invoke__16.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o);
      case 17:
        return _invoke__17.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p);
      case 18:
        return _invoke__18.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q);
      case 19:
        return _invoke__19.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s);
      case 20:
        return _invoke__20.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t);
      case 21:
        return _invoke__21.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _invoke.cljs$lang$arity$1 = _invoke__1;
  _invoke.cljs$lang$arity$2 = _invoke__2;
  _invoke.cljs$lang$arity$3 = _invoke__3;
  _invoke.cljs$lang$arity$4 = _invoke__4;
  _invoke.cljs$lang$arity$5 = _invoke__5;
  _invoke.cljs$lang$arity$6 = _invoke__6;
  _invoke.cljs$lang$arity$7 = _invoke__7;
  _invoke.cljs$lang$arity$8 = _invoke__8;
  _invoke.cljs$lang$arity$9 = _invoke__9;
  _invoke.cljs$lang$arity$10 = _invoke__10;
  _invoke.cljs$lang$arity$11 = _invoke__11;
  _invoke.cljs$lang$arity$12 = _invoke__12;
  _invoke.cljs$lang$arity$13 = _invoke__13;
  _invoke.cljs$lang$arity$14 = _invoke__14;
  _invoke.cljs$lang$arity$15 = _invoke__15;
  _invoke.cljs$lang$arity$16 = _invoke__16;
  _invoke.cljs$lang$arity$17 = _invoke__17;
  _invoke.cljs$lang$arity$18 = _invoke__18;
  _invoke.cljs$lang$arity$19 = _invoke__19;
  _invoke.cljs$lang$arity$20 = _invoke__20;
  _invoke.cljs$lang$arity$21 = _invoke__21;
  return _invoke
}();
cljs.core.ICounted = {};
cljs.core._count = function _count(coll) {
  if(function() {
    var and__3822__auto____6857 = coll;
    if(and__3822__auto____6857) {
      return coll.cljs$core$ICounted$_count$arity$1
    }else {
      return and__3822__auto____6857
    }
  }()) {
    return coll.cljs$core$ICounted$_count$arity$1(coll)
  }else {
    var x__2359__auto____6858 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6859 = cljs.core._count[goog.typeOf(x__2359__auto____6858)];
      if(or__3824__auto____6859) {
        return or__3824__auto____6859
      }else {
        var or__3824__auto____6860 = cljs.core._count["_"];
        if(or__3824__auto____6860) {
          return or__3824__auto____6860
        }else {
          throw cljs.core.missing_protocol.call(null, "ICounted.-count", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.IEmptyableCollection = {};
cljs.core._empty = function _empty(coll) {
  if(function() {
    var and__3822__auto____6865 = coll;
    if(and__3822__auto____6865) {
      return coll.cljs$core$IEmptyableCollection$_empty$arity$1
    }else {
      return and__3822__auto____6865
    }
  }()) {
    return coll.cljs$core$IEmptyableCollection$_empty$arity$1(coll)
  }else {
    var x__2359__auto____6866 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6867 = cljs.core._empty[goog.typeOf(x__2359__auto____6866)];
      if(or__3824__auto____6867) {
        return or__3824__auto____6867
      }else {
        var or__3824__auto____6868 = cljs.core._empty["_"];
        if(or__3824__auto____6868) {
          return or__3824__auto____6868
        }else {
          throw cljs.core.missing_protocol.call(null, "IEmptyableCollection.-empty", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.ICollection = {};
cljs.core._conj = function _conj(coll, o) {
  if(function() {
    var and__3822__auto____6873 = coll;
    if(and__3822__auto____6873) {
      return coll.cljs$core$ICollection$_conj$arity$2
    }else {
      return and__3822__auto____6873
    }
  }()) {
    return coll.cljs$core$ICollection$_conj$arity$2(coll, o)
  }else {
    var x__2359__auto____6874 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6875 = cljs.core._conj[goog.typeOf(x__2359__auto____6874)];
      if(or__3824__auto____6875) {
        return or__3824__auto____6875
      }else {
        var or__3824__auto____6876 = cljs.core._conj["_"];
        if(or__3824__auto____6876) {
          return or__3824__auto____6876
        }else {
          throw cljs.core.missing_protocol.call(null, "ICollection.-conj", coll);
        }
      }
    }().call(null, coll, o)
  }
};
cljs.core.IIndexed = {};
cljs.core._nth = function() {
  var _nth = null;
  var _nth__2 = function(coll, n) {
    if(function() {
      var and__3822__auto____6885 = coll;
      if(and__3822__auto____6885) {
        return coll.cljs$core$IIndexed$_nth$arity$2
      }else {
        return and__3822__auto____6885
      }
    }()) {
      return coll.cljs$core$IIndexed$_nth$arity$2(coll, n)
    }else {
      var x__2359__auto____6886 = coll == null ? null : coll;
      return function() {
        var or__3824__auto____6887 = cljs.core._nth[goog.typeOf(x__2359__auto____6886)];
        if(or__3824__auto____6887) {
          return or__3824__auto____6887
        }else {
          var or__3824__auto____6888 = cljs.core._nth["_"];
          if(or__3824__auto____6888) {
            return or__3824__auto____6888
          }else {
            throw cljs.core.missing_protocol.call(null, "IIndexed.-nth", coll);
          }
        }
      }().call(null, coll, n)
    }
  };
  var _nth__3 = function(coll, n, not_found) {
    if(function() {
      var and__3822__auto____6889 = coll;
      if(and__3822__auto____6889) {
        return coll.cljs$core$IIndexed$_nth$arity$3
      }else {
        return and__3822__auto____6889
      }
    }()) {
      return coll.cljs$core$IIndexed$_nth$arity$3(coll, n, not_found)
    }else {
      var x__2359__auto____6890 = coll == null ? null : coll;
      return function() {
        var or__3824__auto____6891 = cljs.core._nth[goog.typeOf(x__2359__auto____6890)];
        if(or__3824__auto____6891) {
          return or__3824__auto____6891
        }else {
          var or__3824__auto____6892 = cljs.core._nth["_"];
          if(or__3824__auto____6892) {
            return or__3824__auto____6892
          }else {
            throw cljs.core.missing_protocol.call(null, "IIndexed.-nth", coll);
          }
        }
      }().call(null, coll, n, not_found)
    }
  };
  _nth = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return _nth__2.call(this, coll, n);
      case 3:
        return _nth__3.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _nth.cljs$lang$arity$2 = _nth__2;
  _nth.cljs$lang$arity$3 = _nth__3;
  return _nth
}();
cljs.core.ASeq = {};
cljs.core.ISeq = {};
cljs.core._first = function _first(coll) {
  if(function() {
    var and__3822__auto____6897 = coll;
    if(and__3822__auto____6897) {
      return coll.cljs$core$ISeq$_first$arity$1
    }else {
      return and__3822__auto____6897
    }
  }()) {
    return coll.cljs$core$ISeq$_first$arity$1(coll)
  }else {
    var x__2359__auto____6898 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6899 = cljs.core._first[goog.typeOf(x__2359__auto____6898)];
      if(or__3824__auto____6899) {
        return or__3824__auto____6899
      }else {
        var or__3824__auto____6900 = cljs.core._first["_"];
        if(or__3824__auto____6900) {
          return or__3824__auto____6900
        }else {
          throw cljs.core.missing_protocol.call(null, "ISeq.-first", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core._rest = function _rest(coll) {
  if(function() {
    var and__3822__auto____6905 = coll;
    if(and__3822__auto____6905) {
      return coll.cljs$core$ISeq$_rest$arity$1
    }else {
      return and__3822__auto____6905
    }
  }()) {
    return coll.cljs$core$ISeq$_rest$arity$1(coll)
  }else {
    var x__2359__auto____6906 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6907 = cljs.core._rest[goog.typeOf(x__2359__auto____6906)];
      if(or__3824__auto____6907) {
        return or__3824__auto____6907
      }else {
        var or__3824__auto____6908 = cljs.core._rest["_"];
        if(or__3824__auto____6908) {
          return or__3824__auto____6908
        }else {
          throw cljs.core.missing_protocol.call(null, "ISeq.-rest", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.INext = {};
cljs.core._next = function _next(coll) {
  if(function() {
    var and__3822__auto____6913 = coll;
    if(and__3822__auto____6913) {
      return coll.cljs$core$INext$_next$arity$1
    }else {
      return and__3822__auto____6913
    }
  }()) {
    return coll.cljs$core$INext$_next$arity$1(coll)
  }else {
    var x__2359__auto____6914 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6915 = cljs.core._next[goog.typeOf(x__2359__auto____6914)];
      if(or__3824__auto____6915) {
        return or__3824__auto____6915
      }else {
        var or__3824__auto____6916 = cljs.core._next["_"];
        if(or__3824__auto____6916) {
          return or__3824__auto____6916
        }else {
          throw cljs.core.missing_protocol.call(null, "INext.-next", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.ILookup = {};
cljs.core._lookup = function() {
  var _lookup = null;
  var _lookup__2 = function(o, k) {
    if(function() {
      var and__3822__auto____6925 = o;
      if(and__3822__auto____6925) {
        return o.cljs$core$ILookup$_lookup$arity$2
      }else {
        return and__3822__auto____6925
      }
    }()) {
      return o.cljs$core$ILookup$_lookup$arity$2(o, k)
    }else {
      var x__2359__auto____6926 = o == null ? null : o;
      return function() {
        var or__3824__auto____6927 = cljs.core._lookup[goog.typeOf(x__2359__auto____6926)];
        if(or__3824__auto____6927) {
          return or__3824__auto____6927
        }else {
          var or__3824__auto____6928 = cljs.core._lookup["_"];
          if(or__3824__auto____6928) {
            return or__3824__auto____6928
          }else {
            throw cljs.core.missing_protocol.call(null, "ILookup.-lookup", o);
          }
        }
      }().call(null, o, k)
    }
  };
  var _lookup__3 = function(o, k, not_found) {
    if(function() {
      var and__3822__auto____6929 = o;
      if(and__3822__auto____6929) {
        return o.cljs$core$ILookup$_lookup$arity$3
      }else {
        return and__3822__auto____6929
      }
    }()) {
      return o.cljs$core$ILookup$_lookup$arity$3(o, k, not_found)
    }else {
      var x__2359__auto____6930 = o == null ? null : o;
      return function() {
        var or__3824__auto____6931 = cljs.core._lookup[goog.typeOf(x__2359__auto____6930)];
        if(or__3824__auto____6931) {
          return or__3824__auto____6931
        }else {
          var or__3824__auto____6932 = cljs.core._lookup["_"];
          if(or__3824__auto____6932) {
            return or__3824__auto____6932
          }else {
            throw cljs.core.missing_protocol.call(null, "ILookup.-lookup", o);
          }
        }
      }().call(null, o, k, not_found)
    }
  };
  _lookup = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return _lookup__2.call(this, o, k);
      case 3:
        return _lookup__3.call(this, o, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _lookup.cljs$lang$arity$2 = _lookup__2;
  _lookup.cljs$lang$arity$3 = _lookup__3;
  return _lookup
}();
cljs.core.IAssociative = {};
cljs.core._contains_key_QMARK_ = function _contains_key_QMARK_(coll, k) {
  if(function() {
    var and__3822__auto____6937 = coll;
    if(and__3822__auto____6937) {
      return coll.cljs$core$IAssociative$_contains_key_QMARK_$arity$2
    }else {
      return and__3822__auto____6937
    }
  }()) {
    return coll.cljs$core$IAssociative$_contains_key_QMARK_$arity$2(coll, k)
  }else {
    var x__2359__auto____6938 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6939 = cljs.core._contains_key_QMARK_[goog.typeOf(x__2359__auto____6938)];
      if(or__3824__auto____6939) {
        return or__3824__auto____6939
      }else {
        var or__3824__auto____6940 = cljs.core._contains_key_QMARK_["_"];
        if(or__3824__auto____6940) {
          return or__3824__auto____6940
        }else {
          throw cljs.core.missing_protocol.call(null, "IAssociative.-contains-key?", coll);
        }
      }
    }().call(null, coll, k)
  }
};
cljs.core._assoc = function _assoc(coll, k, v) {
  if(function() {
    var and__3822__auto____6945 = coll;
    if(and__3822__auto____6945) {
      return coll.cljs$core$IAssociative$_assoc$arity$3
    }else {
      return and__3822__auto____6945
    }
  }()) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, k, v)
  }else {
    var x__2359__auto____6946 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6947 = cljs.core._assoc[goog.typeOf(x__2359__auto____6946)];
      if(or__3824__auto____6947) {
        return or__3824__auto____6947
      }else {
        var or__3824__auto____6948 = cljs.core._assoc["_"];
        if(or__3824__auto____6948) {
          return or__3824__auto____6948
        }else {
          throw cljs.core.missing_protocol.call(null, "IAssociative.-assoc", coll);
        }
      }
    }().call(null, coll, k, v)
  }
};
cljs.core.IMap = {};
cljs.core._dissoc = function _dissoc(coll, k) {
  if(function() {
    var and__3822__auto____6953 = coll;
    if(and__3822__auto____6953) {
      return coll.cljs$core$IMap$_dissoc$arity$2
    }else {
      return and__3822__auto____6953
    }
  }()) {
    return coll.cljs$core$IMap$_dissoc$arity$2(coll, k)
  }else {
    var x__2359__auto____6954 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6955 = cljs.core._dissoc[goog.typeOf(x__2359__auto____6954)];
      if(or__3824__auto____6955) {
        return or__3824__auto____6955
      }else {
        var or__3824__auto____6956 = cljs.core._dissoc["_"];
        if(or__3824__auto____6956) {
          return or__3824__auto____6956
        }else {
          throw cljs.core.missing_protocol.call(null, "IMap.-dissoc", coll);
        }
      }
    }().call(null, coll, k)
  }
};
cljs.core.IMapEntry = {};
cljs.core._key = function _key(coll) {
  if(function() {
    var and__3822__auto____6961 = coll;
    if(and__3822__auto____6961) {
      return coll.cljs$core$IMapEntry$_key$arity$1
    }else {
      return and__3822__auto____6961
    }
  }()) {
    return coll.cljs$core$IMapEntry$_key$arity$1(coll)
  }else {
    var x__2359__auto____6962 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6963 = cljs.core._key[goog.typeOf(x__2359__auto____6962)];
      if(or__3824__auto____6963) {
        return or__3824__auto____6963
      }else {
        var or__3824__auto____6964 = cljs.core._key["_"];
        if(or__3824__auto____6964) {
          return or__3824__auto____6964
        }else {
          throw cljs.core.missing_protocol.call(null, "IMapEntry.-key", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core._val = function _val(coll) {
  if(function() {
    var and__3822__auto____6969 = coll;
    if(and__3822__auto____6969) {
      return coll.cljs$core$IMapEntry$_val$arity$1
    }else {
      return and__3822__auto____6969
    }
  }()) {
    return coll.cljs$core$IMapEntry$_val$arity$1(coll)
  }else {
    var x__2359__auto____6970 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6971 = cljs.core._val[goog.typeOf(x__2359__auto____6970)];
      if(or__3824__auto____6971) {
        return or__3824__auto____6971
      }else {
        var or__3824__auto____6972 = cljs.core._val["_"];
        if(or__3824__auto____6972) {
          return or__3824__auto____6972
        }else {
          throw cljs.core.missing_protocol.call(null, "IMapEntry.-val", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.ISet = {};
cljs.core._disjoin = function _disjoin(coll, v) {
  if(function() {
    var and__3822__auto____6977 = coll;
    if(and__3822__auto____6977) {
      return coll.cljs$core$ISet$_disjoin$arity$2
    }else {
      return and__3822__auto____6977
    }
  }()) {
    return coll.cljs$core$ISet$_disjoin$arity$2(coll, v)
  }else {
    var x__2359__auto____6978 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6979 = cljs.core._disjoin[goog.typeOf(x__2359__auto____6978)];
      if(or__3824__auto____6979) {
        return or__3824__auto____6979
      }else {
        var or__3824__auto____6980 = cljs.core._disjoin["_"];
        if(or__3824__auto____6980) {
          return or__3824__auto____6980
        }else {
          throw cljs.core.missing_protocol.call(null, "ISet.-disjoin", coll);
        }
      }
    }().call(null, coll, v)
  }
};
cljs.core.IStack = {};
cljs.core._peek = function _peek(coll) {
  if(function() {
    var and__3822__auto____6985 = coll;
    if(and__3822__auto____6985) {
      return coll.cljs$core$IStack$_peek$arity$1
    }else {
      return and__3822__auto____6985
    }
  }()) {
    return coll.cljs$core$IStack$_peek$arity$1(coll)
  }else {
    var x__2359__auto____6986 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6987 = cljs.core._peek[goog.typeOf(x__2359__auto____6986)];
      if(or__3824__auto____6987) {
        return or__3824__auto____6987
      }else {
        var or__3824__auto____6988 = cljs.core._peek["_"];
        if(or__3824__auto____6988) {
          return or__3824__auto____6988
        }else {
          throw cljs.core.missing_protocol.call(null, "IStack.-peek", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core._pop = function _pop(coll) {
  if(function() {
    var and__3822__auto____6993 = coll;
    if(and__3822__auto____6993) {
      return coll.cljs$core$IStack$_pop$arity$1
    }else {
      return and__3822__auto____6993
    }
  }()) {
    return coll.cljs$core$IStack$_pop$arity$1(coll)
  }else {
    var x__2359__auto____6994 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6995 = cljs.core._pop[goog.typeOf(x__2359__auto____6994)];
      if(or__3824__auto____6995) {
        return or__3824__auto____6995
      }else {
        var or__3824__auto____6996 = cljs.core._pop["_"];
        if(or__3824__auto____6996) {
          return or__3824__auto____6996
        }else {
          throw cljs.core.missing_protocol.call(null, "IStack.-pop", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.IVector = {};
cljs.core._assoc_n = function _assoc_n(coll, n, val) {
  if(function() {
    var and__3822__auto____7001 = coll;
    if(and__3822__auto____7001) {
      return coll.cljs$core$IVector$_assoc_n$arity$3
    }else {
      return and__3822__auto____7001
    }
  }()) {
    return coll.cljs$core$IVector$_assoc_n$arity$3(coll, n, val)
  }else {
    var x__2359__auto____7002 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____7003 = cljs.core._assoc_n[goog.typeOf(x__2359__auto____7002)];
      if(or__3824__auto____7003) {
        return or__3824__auto____7003
      }else {
        var or__3824__auto____7004 = cljs.core._assoc_n["_"];
        if(or__3824__auto____7004) {
          return or__3824__auto____7004
        }else {
          throw cljs.core.missing_protocol.call(null, "IVector.-assoc-n", coll);
        }
      }
    }().call(null, coll, n, val)
  }
};
cljs.core.IDeref = {};
cljs.core._deref = function _deref(o) {
  if(function() {
    var and__3822__auto____7009 = o;
    if(and__3822__auto____7009) {
      return o.cljs$core$IDeref$_deref$arity$1
    }else {
      return and__3822__auto____7009
    }
  }()) {
    return o.cljs$core$IDeref$_deref$arity$1(o)
  }else {
    var x__2359__auto____7010 = o == null ? null : o;
    return function() {
      var or__3824__auto____7011 = cljs.core._deref[goog.typeOf(x__2359__auto____7010)];
      if(or__3824__auto____7011) {
        return or__3824__auto____7011
      }else {
        var or__3824__auto____7012 = cljs.core._deref["_"];
        if(or__3824__auto____7012) {
          return or__3824__auto____7012
        }else {
          throw cljs.core.missing_protocol.call(null, "IDeref.-deref", o);
        }
      }
    }().call(null, o)
  }
};
cljs.core.IDerefWithTimeout = {};
cljs.core._deref_with_timeout = function _deref_with_timeout(o, msec, timeout_val) {
  if(function() {
    var and__3822__auto____7017 = o;
    if(and__3822__auto____7017) {
      return o.cljs$core$IDerefWithTimeout$_deref_with_timeout$arity$3
    }else {
      return and__3822__auto____7017
    }
  }()) {
    return o.cljs$core$IDerefWithTimeout$_deref_with_timeout$arity$3(o, msec, timeout_val)
  }else {
    var x__2359__auto____7018 = o == null ? null : o;
    return function() {
      var or__3824__auto____7019 = cljs.core._deref_with_timeout[goog.typeOf(x__2359__auto____7018)];
      if(or__3824__auto____7019) {
        return or__3824__auto____7019
      }else {
        var or__3824__auto____7020 = cljs.core._deref_with_timeout["_"];
        if(or__3824__auto____7020) {
          return or__3824__auto____7020
        }else {
          throw cljs.core.missing_protocol.call(null, "IDerefWithTimeout.-deref-with-timeout", o);
        }
      }
    }().call(null, o, msec, timeout_val)
  }
};
cljs.core.IMeta = {};
cljs.core._meta = function _meta(o) {
  if(function() {
    var and__3822__auto____7025 = o;
    if(and__3822__auto____7025) {
      return o.cljs$core$IMeta$_meta$arity$1
    }else {
      return and__3822__auto____7025
    }
  }()) {
    return o.cljs$core$IMeta$_meta$arity$1(o)
  }else {
    var x__2359__auto____7026 = o == null ? null : o;
    return function() {
      var or__3824__auto____7027 = cljs.core._meta[goog.typeOf(x__2359__auto____7026)];
      if(or__3824__auto____7027) {
        return or__3824__auto____7027
      }else {
        var or__3824__auto____7028 = cljs.core._meta["_"];
        if(or__3824__auto____7028) {
          return or__3824__auto____7028
        }else {
          throw cljs.core.missing_protocol.call(null, "IMeta.-meta", o);
        }
      }
    }().call(null, o)
  }
};
cljs.core.IWithMeta = {};
cljs.core._with_meta = function _with_meta(o, meta) {
  if(function() {
    var and__3822__auto____7033 = o;
    if(and__3822__auto____7033) {
      return o.cljs$core$IWithMeta$_with_meta$arity$2
    }else {
      return and__3822__auto____7033
    }
  }()) {
    return o.cljs$core$IWithMeta$_with_meta$arity$2(o, meta)
  }else {
    var x__2359__auto____7034 = o == null ? null : o;
    return function() {
      var or__3824__auto____7035 = cljs.core._with_meta[goog.typeOf(x__2359__auto____7034)];
      if(or__3824__auto____7035) {
        return or__3824__auto____7035
      }else {
        var or__3824__auto____7036 = cljs.core._with_meta["_"];
        if(or__3824__auto____7036) {
          return or__3824__auto____7036
        }else {
          throw cljs.core.missing_protocol.call(null, "IWithMeta.-with-meta", o);
        }
      }
    }().call(null, o, meta)
  }
};
cljs.core.IReduce = {};
cljs.core._reduce = function() {
  var _reduce = null;
  var _reduce__2 = function(coll, f) {
    if(function() {
      var and__3822__auto____7045 = coll;
      if(and__3822__auto____7045) {
        return coll.cljs$core$IReduce$_reduce$arity$2
      }else {
        return and__3822__auto____7045
      }
    }()) {
      return coll.cljs$core$IReduce$_reduce$arity$2(coll, f)
    }else {
      var x__2359__auto____7046 = coll == null ? null : coll;
      return function() {
        var or__3824__auto____7047 = cljs.core._reduce[goog.typeOf(x__2359__auto____7046)];
        if(or__3824__auto____7047) {
          return or__3824__auto____7047
        }else {
          var or__3824__auto____7048 = cljs.core._reduce["_"];
          if(or__3824__auto____7048) {
            return or__3824__auto____7048
          }else {
            throw cljs.core.missing_protocol.call(null, "IReduce.-reduce", coll);
          }
        }
      }().call(null, coll, f)
    }
  };
  var _reduce__3 = function(coll, f, start) {
    if(function() {
      var and__3822__auto____7049 = coll;
      if(and__3822__auto____7049) {
        return coll.cljs$core$IReduce$_reduce$arity$3
      }else {
        return and__3822__auto____7049
      }
    }()) {
      return coll.cljs$core$IReduce$_reduce$arity$3(coll, f, start)
    }else {
      var x__2359__auto____7050 = coll == null ? null : coll;
      return function() {
        var or__3824__auto____7051 = cljs.core._reduce[goog.typeOf(x__2359__auto____7050)];
        if(or__3824__auto____7051) {
          return or__3824__auto____7051
        }else {
          var or__3824__auto____7052 = cljs.core._reduce["_"];
          if(or__3824__auto____7052) {
            return or__3824__auto____7052
          }else {
            throw cljs.core.missing_protocol.call(null, "IReduce.-reduce", coll);
          }
        }
      }().call(null, coll, f, start)
    }
  };
  _reduce = function(coll, f, start) {
    switch(arguments.length) {
      case 2:
        return _reduce__2.call(this, coll, f);
      case 3:
        return _reduce__3.call(this, coll, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _reduce.cljs$lang$arity$2 = _reduce__2;
  _reduce.cljs$lang$arity$3 = _reduce__3;
  return _reduce
}();
cljs.core.IKVReduce = {};
cljs.core._kv_reduce = function _kv_reduce(coll, f, init) {
  if(function() {
    var and__3822__auto____7057 = coll;
    if(and__3822__auto____7057) {
      return coll.cljs$core$IKVReduce$_kv_reduce$arity$3
    }else {
      return and__3822__auto____7057
    }
  }()) {
    return coll.cljs$core$IKVReduce$_kv_reduce$arity$3(coll, f, init)
  }else {
    var x__2359__auto____7058 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____7059 = cljs.core._kv_reduce[goog.typeOf(x__2359__auto____7058)];
      if(or__3824__auto____7059) {
        return or__3824__auto____7059
      }else {
        var or__3824__auto____7060 = cljs.core._kv_reduce["_"];
        if(or__3824__auto____7060) {
          return or__3824__auto____7060
        }else {
          throw cljs.core.missing_protocol.call(null, "IKVReduce.-kv-reduce", coll);
        }
      }
    }().call(null, coll, f, init)
  }
};
cljs.core.IEquiv = {};
cljs.core._equiv = function _equiv(o, other) {
  if(function() {
    var and__3822__auto____7065 = o;
    if(and__3822__auto____7065) {
      return o.cljs$core$IEquiv$_equiv$arity$2
    }else {
      return and__3822__auto____7065
    }
  }()) {
    return o.cljs$core$IEquiv$_equiv$arity$2(o, other)
  }else {
    var x__2359__auto____7066 = o == null ? null : o;
    return function() {
      var or__3824__auto____7067 = cljs.core._equiv[goog.typeOf(x__2359__auto____7066)];
      if(or__3824__auto____7067) {
        return or__3824__auto____7067
      }else {
        var or__3824__auto____7068 = cljs.core._equiv["_"];
        if(or__3824__auto____7068) {
          return or__3824__auto____7068
        }else {
          throw cljs.core.missing_protocol.call(null, "IEquiv.-equiv", o);
        }
      }
    }().call(null, o, other)
  }
};
cljs.core.IHash = {};
cljs.core._hash = function _hash(o) {
  if(function() {
    var and__3822__auto____7073 = o;
    if(and__3822__auto____7073) {
      return o.cljs$core$IHash$_hash$arity$1
    }else {
      return and__3822__auto____7073
    }
  }()) {
    return o.cljs$core$IHash$_hash$arity$1(o)
  }else {
    var x__2359__auto____7074 = o == null ? null : o;
    return function() {
      var or__3824__auto____7075 = cljs.core._hash[goog.typeOf(x__2359__auto____7074)];
      if(or__3824__auto____7075) {
        return or__3824__auto____7075
      }else {
        var or__3824__auto____7076 = cljs.core._hash["_"];
        if(or__3824__auto____7076) {
          return or__3824__auto____7076
        }else {
          throw cljs.core.missing_protocol.call(null, "IHash.-hash", o);
        }
      }
    }().call(null, o)
  }
};
cljs.core.ISeqable = {};
cljs.core._seq = function _seq(o) {
  if(function() {
    var and__3822__auto____7081 = o;
    if(and__3822__auto____7081) {
      return o.cljs$core$ISeqable$_seq$arity$1
    }else {
      return and__3822__auto____7081
    }
  }()) {
    return o.cljs$core$ISeqable$_seq$arity$1(o)
  }else {
    var x__2359__auto____7082 = o == null ? null : o;
    return function() {
      var or__3824__auto____7083 = cljs.core._seq[goog.typeOf(x__2359__auto____7082)];
      if(or__3824__auto____7083) {
        return or__3824__auto____7083
      }else {
        var or__3824__auto____7084 = cljs.core._seq["_"];
        if(or__3824__auto____7084) {
          return or__3824__auto____7084
        }else {
          throw cljs.core.missing_protocol.call(null, "ISeqable.-seq", o);
        }
      }
    }().call(null, o)
  }
};
cljs.core.ISequential = {};
cljs.core.IList = {};
cljs.core.IRecord = {};
cljs.core.IReversible = {};
cljs.core._rseq = function _rseq(coll) {
  if(function() {
    var and__3822__auto____7089 = coll;
    if(and__3822__auto____7089) {
      return coll.cljs$core$IReversible$_rseq$arity$1
    }else {
      return and__3822__auto____7089
    }
  }()) {
    return coll.cljs$core$IReversible$_rseq$arity$1(coll)
  }else {
    var x__2359__auto____7090 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____7091 = cljs.core._rseq[goog.typeOf(x__2359__auto____7090)];
      if(or__3824__auto____7091) {
        return or__3824__auto____7091
      }else {
        var or__3824__auto____7092 = cljs.core._rseq["_"];
        if(or__3824__auto____7092) {
          return or__3824__auto____7092
        }else {
          throw cljs.core.missing_protocol.call(null, "IReversible.-rseq", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.ISorted = {};
cljs.core._sorted_seq = function _sorted_seq(coll, ascending_QMARK_) {
  if(function() {
    var and__3822__auto____7097 = coll;
    if(and__3822__auto____7097) {
      return coll.cljs$core$ISorted$_sorted_seq$arity$2
    }else {
      return and__3822__auto____7097
    }
  }()) {
    return coll.cljs$core$ISorted$_sorted_seq$arity$2(coll, ascending_QMARK_)
  }else {
    var x__2359__auto____7098 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____7099 = cljs.core._sorted_seq[goog.typeOf(x__2359__auto____7098)];
      if(or__3824__auto____7099) {
        return or__3824__auto____7099
      }else {
        var or__3824__auto____7100 = cljs.core._sorted_seq["_"];
        if(or__3824__auto____7100) {
          return or__3824__auto____7100
        }else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-sorted-seq", coll);
        }
      }
    }().call(null, coll, ascending_QMARK_)
  }
};
cljs.core._sorted_seq_from = function _sorted_seq_from(coll, k, ascending_QMARK_) {
  if(function() {
    var and__3822__auto____7105 = coll;
    if(and__3822__auto____7105) {
      return coll.cljs$core$ISorted$_sorted_seq_from$arity$3
    }else {
      return and__3822__auto____7105
    }
  }()) {
    return coll.cljs$core$ISorted$_sorted_seq_from$arity$3(coll, k, ascending_QMARK_)
  }else {
    var x__2359__auto____7106 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____7107 = cljs.core._sorted_seq_from[goog.typeOf(x__2359__auto____7106)];
      if(or__3824__auto____7107) {
        return or__3824__auto____7107
      }else {
        var or__3824__auto____7108 = cljs.core._sorted_seq_from["_"];
        if(or__3824__auto____7108) {
          return or__3824__auto____7108
        }else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-sorted-seq-from", coll);
        }
      }
    }().call(null, coll, k, ascending_QMARK_)
  }
};
cljs.core._entry_key = function _entry_key(coll, entry) {
  if(function() {
    var and__3822__auto____7113 = coll;
    if(and__3822__auto____7113) {
      return coll.cljs$core$ISorted$_entry_key$arity$2
    }else {
      return and__3822__auto____7113
    }
  }()) {
    return coll.cljs$core$ISorted$_entry_key$arity$2(coll, entry)
  }else {
    var x__2359__auto____7114 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____7115 = cljs.core._entry_key[goog.typeOf(x__2359__auto____7114)];
      if(or__3824__auto____7115) {
        return or__3824__auto____7115
      }else {
        var or__3824__auto____7116 = cljs.core._entry_key["_"];
        if(or__3824__auto____7116) {
          return or__3824__auto____7116
        }else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-entry-key", coll);
        }
      }
    }().call(null, coll, entry)
  }
};
cljs.core._comparator = function _comparator(coll) {
  if(function() {
    var and__3822__auto____7121 = coll;
    if(and__3822__auto____7121) {
      return coll.cljs$core$ISorted$_comparator$arity$1
    }else {
      return and__3822__auto____7121
    }
  }()) {
    return coll.cljs$core$ISorted$_comparator$arity$1(coll)
  }else {
    var x__2359__auto____7122 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____7123 = cljs.core._comparator[goog.typeOf(x__2359__auto____7122)];
      if(or__3824__auto____7123) {
        return or__3824__auto____7123
      }else {
        var or__3824__auto____7124 = cljs.core._comparator["_"];
        if(or__3824__auto____7124) {
          return or__3824__auto____7124
        }else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-comparator", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.IPrintable = {};
cljs.core._pr_seq = function _pr_seq(o, opts) {
  if(function() {
    var and__3822__auto____7129 = o;
    if(and__3822__auto____7129) {
      return o.cljs$core$IPrintable$_pr_seq$arity$2
    }else {
      return and__3822__auto____7129
    }
  }()) {
    return o.cljs$core$IPrintable$_pr_seq$arity$2(o, opts)
  }else {
    var x__2359__auto____7130 = o == null ? null : o;
    return function() {
      var or__3824__auto____7131 = cljs.core._pr_seq[goog.typeOf(x__2359__auto____7130)];
      if(or__3824__auto____7131) {
        return or__3824__auto____7131
      }else {
        var or__3824__auto____7132 = cljs.core._pr_seq["_"];
        if(or__3824__auto____7132) {
          return or__3824__auto____7132
        }else {
          throw cljs.core.missing_protocol.call(null, "IPrintable.-pr-seq", o);
        }
      }
    }().call(null, o, opts)
  }
};
cljs.core.IPending = {};
cljs.core._realized_QMARK_ = function _realized_QMARK_(d) {
  if(function() {
    var and__3822__auto____7137 = d;
    if(and__3822__auto____7137) {
      return d.cljs$core$IPending$_realized_QMARK_$arity$1
    }else {
      return and__3822__auto____7137
    }
  }()) {
    return d.cljs$core$IPending$_realized_QMARK_$arity$1(d)
  }else {
    var x__2359__auto____7138 = d == null ? null : d;
    return function() {
      var or__3824__auto____7139 = cljs.core._realized_QMARK_[goog.typeOf(x__2359__auto____7138)];
      if(or__3824__auto____7139) {
        return or__3824__auto____7139
      }else {
        var or__3824__auto____7140 = cljs.core._realized_QMARK_["_"];
        if(or__3824__auto____7140) {
          return or__3824__auto____7140
        }else {
          throw cljs.core.missing_protocol.call(null, "IPending.-realized?", d);
        }
      }
    }().call(null, d)
  }
};
cljs.core.IWatchable = {};
cljs.core._notify_watches = function _notify_watches(this$, oldval, newval) {
  if(function() {
    var and__3822__auto____7145 = this$;
    if(and__3822__auto____7145) {
      return this$.cljs$core$IWatchable$_notify_watches$arity$3
    }else {
      return and__3822__auto____7145
    }
  }()) {
    return this$.cljs$core$IWatchable$_notify_watches$arity$3(this$, oldval, newval)
  }else {
    var x__2359__auto____7146 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____7147 = cljs.core._notify_watches[goog.typeOf(x__2359__auto____7146)];
      if(or__3824__auto____7147) {
        return or__3824__auto____7147
      }else {
        var or__3824__auto____7148 = cljs.core._notify_watches["_"];
        if(or__3824__auto____7148) {
          return or__3824__auto____7148
        }else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-notify-watches", this$);
        }
      }
    }().call(null, this$, oldval, newval)
  }
};
cljs.core._add_watch = function _add_watch(this$, key, f) {
  if(function() {
    var and__3822__auto____7153 = this$;
    if(and__3822__auto____7153) {
      return this$.cljs$core$IWatchable$_add_watch$arity$3
    }else {
      return and__3822__auto____7153
    }
  }()) {
    return this$.cljs$core$IWatchable$_add_watch$arity$3(this$, key, f)
  }else {
    var x__2359__auto____7154 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____7155 = cljs.core._add_watch[goog.typeOf(x__2359__auto____7154)];
      if(or__3824__auto____7155) {
        return or__3824__auto____7155
      }else {
        var or__3824__auto____7156 = cljs.core._add_watch["_"];
        if(or__3824__auto____7156) {
          return or__3824__auto____7156
        }else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-add-watch", this$);
        }
      }
    }().call(null, this$, key, f)
  }
};
cljs.core._remove_watch = function _remove_watch(this$, key) {
  if(function() {
    var and__3822__auto____7161 = this$;
    if(and__3822__auto____7161) {
      return this$.cljs$core$IWatchable$_remove_watch$arity$2
    }else {
      return and__3822__auto____7161
    }
  }()) {
    return this$.cljs$core$IWatchable$_remove_watch$arity$2(this$, key)
  }else {
    var x__2359__auto____7162 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____7163 = cljs.core._remove_watch[goog.typeOf(x__2359__auto____7162)];
      if(or__3824__auto____7163) {
        return or__3824__auto____7163
      }else {
        var or__3824__auto____7164 = cljs.core._remove_watch["_"];
        if(or__3824__auto____7164) {
          return or__3824__auto____7164
        }else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-remove-watch", this$);
        }
      }
    }().call(null, this$, key)
  }
};
cljs.core.IEditableCollection = {};
cljs.core._as_transient = function _as_transient(coll) {
  if(function() {
    var and__3822__auto____7169 = coll;
    if(and__3822__auto____7169) {
      return coll.cljs$core$IEditableCollection$_as_transient$arity$1
    }else {
      return and__3822__auto____7169
    }
  }()) {
    return coll.cljs$core$IEditableCollection$_as_transient$arity$1(coll)
  }else {
    var x__2359__auto____7170 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____7171 = cljs.core._as_transient[goog.typeOf(x__2359__auto____7170)];
      if(or__3824__auto____7171) {
        return or__3824__auto____7171
      }else {
        var or__3824__auto____7172 = cljs.core._as_transient["_"];
        if(or__3824__auto____7172) {
          return or__3824__auto____7172
        }else {
          throw cljs.core.missing_protocol.call(null, "IEditableCollection.-as-transient", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.ITransientCollection = {};
cljs.core._conj_BANG_ = function _conj_BANG_(tcoll, val) {
  if(function() {
    var and__3822__auto____7177 = tcoll;
    if(and__3822__auto____7177) {
      return tcoll.cljs$core$ITransientCollection$_conj_BANG_$arity$2
    }else {
      return and__3822__auto____7177
    }
  }()) {
    return tcoll.cljs$core$ITransientCollection$_conj_BANG_$arity$2(tcoll, val)
  }else {
    var x__2359__auto____7178 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____7179 = cljs.core._conj_BANG_[goog.typeOf(x__2359__auto____7178)];
      if(or__3824__auto____7179) {
        return or__3824__auto____7179
      }else {
        var or__3824__auto____7180 = cljs.core._conj_BANG_["_"];
        if(or__3824__auto____7180) {
          return or__3824__auto____7180
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientCollection.-conj!", tcoll);
        }
      }
    }().call(null, tcoll, val)
  }
};
cljs.core._persistent_BANG_ = function _persistent_BANG_(tcoll) {
  if(function() {
    var and__3822__auto____7185 = tcoll;
    if(and__3822__auto____7185) {
      return tcoll.cljs$core$ITransientCollection$_persistent_BANG_$arity$1
    }else {
      return and__3822__auto____7185
    }
  }()) {
    return tcoll.cljs$core$ITransientCollection$_persistent_BANG_$arity$1(tcoll)
  }else {
    var x__2359__auto____7186 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____7187 = cljs.core._persistent_BANG_[goog.typeOf(x__2359__auto____7186)];
      if(or__3824__auto____7187) {
        return or__3824__auto____7187
      }else {
        var or__3824__auto____7188 = cljs.core._persistent_BANG_["_"];
        if(or__3824__auto____7188) {
          return or__3824__auto____7188
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientCollection.-persistent!", tcoll);
        }
      }
    }().call(null, tcoll)
  }
};
cljs.core.ITransientAssociative = {};
cljs.core._assoc_BANG_ = function _assoc_BANG_(tcoll, key, val) {
  if(function() {
    var and__3822__auto____7193 = tcoll;
    if(and__3822__auto____7193) {
      return tcoll.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3
    }else {
      return and__3822__auto____7193
    }
  }()) {
    return tcoll.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3(tcoll, key, val)
  }else {
    var x__2359__auto____7194 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____7195 = cljs.core._assoc_BANG_[goog.typeOf(x__2359__auto____7194)];
      if(or__3824__auto____7195) {
        return or__3824__auto____7195
      }else {
        var or__3824__auto____7196 = cljs.core._assoc_BANG_["_"];
        if(or__3824__auto____7196) {
          return or__3824__auto____7196
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientAssociative.-assoc!", tcoll);
        }
      }
    }().call(null, tcoll, key, val)
  }
};
cljs.core.ITransientMap = {};
cljs.core._dissoc_BANG_ = function _dissoc_BANG_(tcoll, key) {
  if(function() {
    var and__3822__auto____7201 = tcoll;
    if(and__3822__auto____7201) {
      return tcoll.cljs$core$ITransientMap$_dissoc_BANG_$arity$2
    }else {
      return and__3822__auto____7201
    }
  }()) {
    return tcoll.cljs$core$ITransientMap$_dissoc_BANG_$arity$2(tcoll, key)
  }else {
    var x__2359__auto____7202 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____7203 = cljs.core._dissoc_BANG_[goog.typeOf(x__2359__auto____7202)];
      if(or__3824__auto____7203) {
        return or__3824__auto____7203
      }else {
        var or__3824__auto____7204 = cljs.core._dissoc_BANG_["_"];
        if(or__3824__auto____7204) {
          return or__3824__auto____7204
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientMap.-dissoc!", tcoll);
        }
      }
    }().call(null, tcoll, key)
  }
};
cljs.core.ITransientVector = {};
cljs.core._assoc_n_BANG_ = function _assoc_n_BANG_(tcoll, n, val) {
  if(function() {
    var and__3822__auto____7209 = tcoll;
    if(and__3822__auto____7209) {
      return tcoll.cljs$core$ITransientVector$_assoc_n_BANG_$arity$3
    }else {
      return and__3822__auto____7209
    }
  }()) {
    return tcoll.cljs$core$ITransientVector$_assoc_n_BANG_$arity$3(tcoll, n, val)
  }else {
    var x__2359__auto____7210 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____7211 = cljs.core._assoc_n_BANG_[goog.typeOf(x__2359__auto____7210)];
      if(or__3824__auto____7211) {
        return or__3824__auto____7211
      }else {
        var or__3824__auto____7212 = cljs.core._assoc_n_BANG_["_"];
        if(or__3824__auto____7212) {
          return or__3824__auto____7212
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientVector.-assoc-n!", tcoll);
        }
      }
    }().call(null, tcoll, n, val)
  }
};
cljs.core._pop_BANG_ = function _pop_BANG_(tcoll) {
  if(function() {
    var and__3822__auto____7217 = tcoll;
    if(and__3822__auto____7217) {
      return tcoll.cljs$core$ITransientVector$_pop_BANG_$arity$1
    }else {
      return and__3822__auto____7217
    }
  }()) {
    return tcoll.cljs$core$ITransientVector$_pop_BANG_$arity$1(tcoll)
  }else {
    var x__2359__auto____7218 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____7219 = cljs.core._pop_BANG_[goog.typeOf(x__2359__auto____7218)];
      if(or__3824__auto____7219) {
        return or__3824__auto____7219
      }else {
        var or__3824__auto____7220 = cljs.core._pop_BANG_["_"];
        if(or__3824__auto____7220) {
          return or__3824__auto____7220
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientVector.-pop!", tcoll);
        }
      }
    }().call(null, tcoll)
  }
};
cljs.core.ITransientSet = {};
cljs.core._disjoin_BANG_ = function _disjoin_BANG_(tcoll, v) {
  if(function() {
    var and__3822__auto____7225 = tcoll;
    if(and__3822__auto____7225) {
      return tcoll.cljs$core$ITransientSet$_disjoin_BANG_$arity$2
    }else {
      return and__3822__auto____7225
    }
  }()) {
    return tcoll.cljs$core$ITransientSet$_disjoin_BANG_$arity$2(tcoll, v)
  }else {
    var x__2359__auto____7226 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____7227 = cljs.core._disjoin_BANG_[goog.typeOf(x__2359__auto____7226)];
      if(or__3824__auto____7227) {
        return or__3824__auto____7227
      }else {
        var or__3824__auto____7228 = cljs.core._disjoin_BANG_["_"];
        if(or__3824__auto____7228) {
          return or__3824__auto____7228
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientSet.-disjoin!", tcoll);
        }
      }
    }().call(null, tcoll, v)
  }
};
cljs.core.IComparable = {};
cljs.core._compare = function _compare(x, y) {
  if(function() {
    var and__3822__auto____7233 = x;
    if(and__3822__auto____7233) {
      return x.cljs$core$IComparable$_compare$arity$2
    }else {
      return and__3822__auto____7233
    }
  }()) {
    return x.cljs$core$IComparable$_compare$arity$2(x, y)
  }else {
    var x__2359__auto____7234 = x == null ? null : x;
    return function() {
      var or__3824__auto____7235 = cljs.core._compare[goog.typeOf(x__2359__auto____7234)];
      if(or__3824__auto____7235) {
        return or__3824__auto____7235
      }else {
        var or__3824__auto____7236 = cljs.core._compare["_"];
        if(or__3824__auto____7236) {
          return or__3824__auto____7236
        }else {
          throw cljs.core.missing_protocol.call(null, "IComparable.-compare", x);
        }
      }
    }().call(null, x, y)
  }
};
cljs.core.IChunk = {};
cljs.core._drop_first = function _drop_first(coll) {
  if(function() {
    var and__3822__auto____7241 = coll;
    if(and__3822__auto____7241) {
      return coll.cljs$core$IChunk$_drop_first$arity$1
    }else {
      return and__3822__auto____7241
    }
  }()) {
    return coll.cljs$core$IChunk$_drop_first$arity$1(coll)
  }else {
    var x__2359__auto____7242 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____7243 = cljs.core._drop_first[goog.typeOf(x__2359__auto____7242)];
      if(or__3824__auto____7243) {
        return or__3824__auto____7243
      }else {
        var or__3824__auto____7244 = cljs.core._drop_first["_"];
        if(or__3824__auto____7244) {
          return or__3824__auto____7244
        }else {
          throw cljs.core.missing_protocol.call(null, "IChunk.-drop-first", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.IChunkedSeq = {};
cljs.core._chunked_first = function _chunked_first(coll) {
  if(function() {
    var and__3822__auto____7249 = coll;
    if(and__3822__auto____7249) {
      return coll.cljs$core$IChunkedSeq$_chunked_first$arity$1
    }else {
      return and__3822__auto____7249
    }
  }()) {
    return coll.cljs$core$IChunkedSeq$_chunked_first$arity$1(coll)
  }else {
    var x__2359__auto____7250 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____7251 = cljs.core._chunked_first[goog.typeOf(x__2359__auto____7250)];
      if(or__3824__auto____7251) {
        return or__3824__auto____7251
      }else {
        var or__3824__auto____7252 = cljs.core._chunked_first["_"];
        if(or__3824__auto____7252) {
          return or__3824__auto____7252
        }else {
          throw cljs.core.missing_protocol.call(null, "IChunkedSeq.-chunked-first", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core._chunked_rest = function _chunked_rest(coll) {
  if(function() {
    var and__3822__auto____7257 = coll;
    if(and__3822__auto____7257) {
      return coll.cljs$core$IChunkedSeq$_chunked_rest$arity$1
    }else {
      return and__3822__auto____7257
    }
  }()) {
    return coll.cljs$core$IChunkedSeq$_chunked_rest$arity$1(coll)
  }else {
    var x__2359__auto____7258 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____7259 = cljs.core._chunked_rest[goog.typeOf(x__2359__auto____7258)];
      if(or__3824__auto____7259) {
        return or__3824__auto____7259
      }else {
        var or__3824__auto____7260 = cljs.core._chunked_rest["_"];
        if(or__3824__auto____7260) {
          return or__3824__auto____7260
        }else {
          throw cljs.core.missing_protocol.call(null, "IChunkedSeq.-chunked-rest", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.IChunkedNext = {};
cljs.core._chunked_next = function _chunked_next(coll) {
  if(function() {
    var and__3822__auto____7265 = coll;
    if(and__3822__auto____7265) {
      return coll.cljs$core$IChunkedNext$_chunked_next$arity$1
    }else {
      return and__3822__auto____7265
    }
  }()) {
    return coll.cljs$core$IChunkedNext$_chunked_next$arity$1(coll)
  }else {
    var x__2359__auto____7266 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____7267 = cljs.core._chunked_next[goog.typeOf(x__2359__auto____7266)];
      if(or__3824__auto____7267) {
        return or__3824__auto____7267
      }else {
        var or__3824__auto____7268 = cljs.core._chunked_next["_"];
        if(or__3824__auto____7268) {
          return or__3824__auto____7268
        }else {
          throw cljs.core.missing_protocol.call(null, "IChunkedNext.-chunked-next", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.identical_QMARK_ = function identical_QMARK_(x, y) {
  return x === y
};
cljs.core._EQ_ = function() {
  var _EQ_ = null;
  var _EQ___1 = function(x) {
    return true
  };
  var _EQ___2 = function(x, y) {
    var or__3824__auto____7270 = x === y;
    if(or__3824__auto____7270) {
      return or__3824__auto____7270
    }else {
      return cljs.core._equiv.call(null, x, y)
    }
  };
  var _EQ___3 = function() {
    var G__7271__delegate = function(x, y, more) {
      while(true) {
        if(cljs.core.truth_(_EQ_.call(null, x, y))) {
          if(cljs.core.next.call(null, more)) {
            var G__7272 = y;
            var G__7273 = cljs.core.first.call(null, more);
            var G__7274 = cljs.core.next.call(null, more);
            x = G__7272;
            y = G__7273;
            more = G__7274;
            continue
          }else {
            return _EQ_.call(null, y, cljs.core.first.call(null, more))
          }
        }else {
          return false
        }
        break
      }
    };
    var G__7271 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7271__delegate.call(this, x, y, more)
    };
    G__7271.cljs$lang$maxFixedArity = 2;
    G__7271.cljs$lang$applyTo = function(arglist__7275) {
      var x = cljs.core.first(arglist__7275);
      var y = cljs.core.first(cljs.core.next(arglist__7275));
      var more = cljs.core.rest(cljs.core.next(arglist__7275));
      return G__7271__delegate(x, y, more)
    };
    G__7271.cljs$lang$arity$variadic = G__7271__delegate;
    return G__7271
  }();
  _EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _EQ___1.call(this, x);
      case 2:
        return _EQ___2.call(this, x, y);
      default:
        return _EQ___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _EQ_.cljs$lang$maxFixedArity = 2;
  _EQ_.cljs$lang$applyTo = _EQ___3.cljs$lang$applyTo;
  _EQ_.cljs$lang$arity$1 = _EQ___1;
  _EQ_.cljs$lang$arity$2 = _EQ___2;
  _EQ_.cljs$lang$arity$variadic = _EQ___3.cljs$lang$arity$variadic;
  return _EQ_
}();
cljs.core.nil_QMARK_ = function nil_QMARK_(x) {
  return x == null
};
cljs.core.type = function type(x) {
  if(x == null) {
    return null
  }else {
    return x.constructor
  }
};
cljs.core.instance_QMARK_ = function instance_QMARK_(t, o) {
  return o instanceof t
};
cljs.core.IHash["null"] = true;
cljs.core._hash["null"] = function(o) {
  return 0
};
cljs.core.ILookup["null"] = true;
cljs.core._lookup["null"] = function() {
  var G__7276 = null;
  var G__7276__2 = function(o, k) {
    return null
  };
  var G__7276__3 = function(o, k, not_found) {
    return not_found
  };
  G__7276 = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__7276__2.call(this, o, k);
      case 3:
        return G__7276__3.call(this, o, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7276
}();
cljs.core.IAssociative["null"] = true;
cljs.core._assoc["null"] = function(_, k, v) {
  return cljs.core.hash_map.call(null, k, v)
};
cljs.core.INext["null"] = true;
cljs.core._next["null"] = function(_) {
  return null
};
cljs.core.ICollection["null"] = true;
cljs.core._conj["null"] = function(_, o) {
  return cljs.core.list.call(null, o)
};
cljs.core.IReduce["null"] = true;
cljs.core._reduce["null"] = function() {
  var G__7277 = null;
  var G__7277__2 = function(_, f) {
    return f.call(null)
  };
  var G__7277__3 = function(_, f, start) {
    return start
  };
  G__7277 = function(_, f, start) {
    switch(arguments.length) {
      case 2:
        return G__7277__2.call(this, _, f);
      case 3:
        return G__7277__3.call(this, _, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7277
}();
cljs.core.IPrintable["null"] = true;
cljs.core._pr_seq["null"] = function(o) {
  return cljs.core.list.call(null, "nil")
};
cljs.core.ISet["null"] = true;
cljs.core._disjoin["null"] = function(_, v) {
  return null
};
cljs.core.ICounted["null"] = true;
cljs.core._count["null"] = function(_) {
  return 0
};
cljs.core.IStack["null"] = true;
cljs.core._peek["null"] = function(_) {
  return null
};
cljs.core._pop["null"] = function(_) {
  return null
};
cljs.core.ISeq["null"] = true;
cljs.core._first["null"] = function(_) {
  return null
};
cljs.core._rest["null"] = function(_) {
  return cljs.core.list.call(null)
};
cljs.core.IEquiv["null"] = true;
cljs.core._equiv["null"] = function(_, o) {
  return o == null
};
cljs.core.IWithMeta["null"] = true;
cljs.core._with_meta["null"] = function(_, meta) {
  return null
};
cljs.core.IMeta["null"] = true;
cljs.core._meta["null"] = function(_) {
  return null
};
cljs.core.IIndexed["null"] = true;
cljs.core._nth["null"] = function() {
  var G__7278 = null;
  var G__7278__2 = function(_, n) {
    return null
  };
  var G__7278__3 = function(_, n, not_found) {
    return not_found
  };
  G__7278 = function(_, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__7278__2.call(this, _, n);
      case 3:
        return G__7278__3.call(this, _, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7278
}();
cljs.core.IEmptyableCollection["null"] = true;
cljs.core._empty["null"] = function(_) {
  return null
};
cljs.core.IMap["null"] = true;
cljs.core._dissoc["null"] = function(_, k) {
  return null
};
Date.prototype.cljs$core$IEquiv$ = true;
Date.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(o, other) {
  var and__3822__auto____7279 = cljs.core.instance_QMARK_.call(null, Date, other);
  if(and__3822__auto____7279) {
    return o.toString() === other.toString()
  }else {
    return and__3822__auto____7279
  }
};
cljs.core.IHash["number"] = true;
cljs.core._hash["number"] = function(o) {
  return o
};
cljs.core.IEquiv["number"] = true;
cljs.core._equiv["number"] = function(x, o) {
  return x === o
};
cljs.core.IHash["boolean"] = true;
cljs.core._hash["boolean"] = function(o) {
  if(o === true) {
    return 1
  }else {
    return 0
  }
};
cljs.core.IHash["_"] = true;
cljs.core._hash["_"] = function(o) {
  return goog.getUid(o)
};
cljs.core.inc = function inc(x) {
  return x + 1
};
cljs.core.ci_reduce = function() {
  var ci_reduce = null;
  var ci_reduce__2 = function(cicoll, f) {
    var cnt__7292 = cljs.core._count.call(null, cicoll);
    if(cnt__7292 === 0) {
      return f.call(null)
    }else {
      var val__7293 = cljs.core._nth.call(null, cicoll, 0);
      var n__7294 = 1;
      while(true) {
        if(n__7294 < cnt__7292) {
          var nval__7295 = f.call(null, val__7293, cljs.core._nth.call(null, cicoll, n__7294));
          if(cljs.core.reduced_QMARK_.call(null, nval__7295)) {
            return cljs.core.deref.call(null, nval__7295)
          }else {
            var G__7304 = nval__7295;
            var G__7305 = n__7294 + 1;
            val__7293 = G__7304;
            n__7294 = G__7305;
            continue
          }
        }else {
          return val__7293
        }
        break
      }
    }
  };
  var ci_reduce__3 = function(cicoll, f, val) {
    var cnt__7296 = cljs.core._count.call(null, cicoll);
    var val__7297 = val;
    var n__7298 = 0;
    while(true) {
      if(n__7298 < cnt__7296) {
        var nval__7299 = f.call(null, val__7297, cljs.core._nth.call(null, cicoll, n__7298));
        if(cljs.core.reduced_QMARK_.call(null, nval__7299)) {
          return cljs.core.deref.call(null, nval__7299)
        }else {
          var G__7306 = nval__7299;
          var G__7307 = n__7298 + 1;
          val__7297 = G__7306;
          n__7298 = G__7307;
          continue
        }
      }else {
        return val__7297
      }
      break
    }
  };
  var ci_reduce__4 = function(cicoll, f, val, idx) {
    var cnt__7300 = cljs.core._count.call(null, cicoll);
    var val__7301 = val;
    var n__7302 = idx;
    while(true) {
      if(n__7302 < cnt__7300) {
        var nval__7303 = f.call(null, val__7301, cljs.core._nth.call(null, cicoll, n__7302));
        if(cljs.core.reduced_QMARK_.call(null, nval__7303)) {
          return cljs.core.deref.call(null, nval__7303)
        }else {
          var G__7308 = nval__7303;
          var G__7309 = n__7302 + 1;
          val__7301 = G__7308;
          n__7302 = G__7309;
          continue
        }
      }else {
        return val__7301
      }
      break
    }
  };
  ci_reduce = function(cicoll, f, val, idx) {
    switch(arguments.length) {
      case 2:
        return ci_reduce__2.call(this, cicoll, f);
      case 3:
        return ci_reduce__3.call(this, cicoll, f, val);
      case 4:
        return ci_reduce__4.call(this, cicoll, f, val, idx)
    }
    throw"Invalid arity: " + arguments.length;
  };
  ci_reduce.cljs$lang$arity$2 = ci_reduce__2;
  ci_reduce.cljs$lang$arity$3 = ci_reduce__3;
  ci_reduce.cljs$lang$arity$4 = ci_reduce__4;
  return ci_reduce
}();
cljs.core.array_reduce = function() {
  var array_reduce = null;
  var array_reduce__2 = function(arr, f) {
    var cnt__7322 = arr.length;
    if(arr.length === 0) {
      return f.call(null)
    }else {
      var val__7323 = arr[0];
      var n__7324 = 1;
      while(true) {
        if(n__7324 < cnt__7322) {
          var nval__7325 = f.call(null, val__7323, arr[n__7324]);
          if(cljs.core.reduced_QMARK_.call(null, nval__7325)) {
            return cljs.core.deref.call(null, nval__7325)
          }else {
            var G__7334 = nval__7325;
            var G__7335 = n__7324 + 1;
            val__7323 = G__7334;
            n__7324 = G__7335;
            continue
          }
        }else {
          return val__7323
        }
        break
      }
    }
  };
  var array_reduce__3 = function(arr, f, val) {
    var cnt__7326 = arr.length;
    var val__7327 = val;
    var n__7328 = 0;
    while(true) {
      if(n__7328 < cnt__7326) {
        var nval__7329 = f.call(null, val__7327, arr[n__7328]);
        if(cljs.core.reduced_QMARK_.call(null, nval__7329)) {
          return cljs.core.deref.call(null, nval__7329)
        }else {
          var G__7336 = nval__7329;
          var G__7337 = n__7328 + 1;
          val__7327 = G__7336;
          n__7328 = G__7337;
          continue
        }
      }else {
        return val__7327
      }
      break
    }
  };
  var array_reduce__4 = function(arr, f, val, idx) {
    var cnt__7330 = arr.length;
    var val__7331 = val;
    var n__7332 = idx;
    while(true) {
      if(n__7332 < cnt__7330) {
        var nval__7333 = f.call(null, val__7331, arr[n__7332]);
        if(cljs.core.reduced_QMARK_.call(null, nval__7333)) {
          return cljs.core.deref.call(null, nval__7333)
        }else {
          var G__7338 = nval__7333;
          var G__7339 = n__7332 + 1;
          val__7331 = G__7338;
          n__7332 = G__7339;
          continue
        }
      }else {
        return val__7331
      }
      break
    }
  };
  array_reduce = function(arr, f, val, idx) {
    switch(arguments.length) {
      case 2:
        return array_reduce__2.call(this, arr, f);
      case 3:
        return array_reduce__3.call(this, arr, f, val);
      case 4:
        return array_reduce__4.call(this, arr, f, val, idx)
    }
    throw"Invalid arity: " + arguments.length;
  };
  array_reduce.cljs$lang$arity$2 = array_reduce__2;
  array_reduce.cljs$lang$arity$3 = array_reduce__3;
  array_reduce.cljs$lang$arity$4 = array_reduce__4;
  return array_reduce
}();
cljs.core.IndexedSeq = function(a, i) {
  this.a = a;
  this.i = i;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 166199546
};
cljs.core.IndexedSeq.cljs$lang$type = true;
cljs.core.IndexedSeq.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/IndexedSeq")
};
cljs.core.IndexedSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__7340 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.IndexedSeq.prototype.cljs$core$INext$_next$arity$1 = function(_) {
  var this__7341 = this;
  if(this__7341.i + 1 < this__7341.a.length) {
    return new cljs.core.IndexedSeq(this__7341.a, this__7341.i + 1)
  }else {
    return null
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__7342 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.IndexedSeq.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var this__7343 = this;
  var c__7344 = coll.cljs$core$ICounted$_count$arity$1(coll);
  if(c__7344 > 0) {
    return new cljs.core.RSeq(coll, c__7344 - 1, null)
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.IndexedSeq.prototype.toString = function() {
  var this__7345 = this;
  var this__7346 = this;
  return cljs.core.pr_str.call(null, this__7346)
};
cljs.core.IndexedSeq.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var this__7347 = this;
  if(cljs.core.counted_QMARK_.call(null, this__7347.a)) {
    return cljs.core.ci_reduce.call(null, this__7347.a, f, this__7347.a[this__7347.i], this__7347.i + 1)
  }else {
    return cljs.core.ci_reduce.call(null, coll, f, this__7347.a[this__7347.i], 0)
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var this__7348 = this;
  if(cljs.core.counted_QMARK_.call(null, this__7348.a)) {
    return cljs.core.ci_reduce.call(null, this__7348.a, f, start, this__7348.i)
  }else {
    return cljs.core.ci_reduce.call(null, coll, f, start, 0)
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var this__7349 = this;
  return this$
};
cljs.core.IndexedSeq.prototype.cljs$core$ICounted$_count$arity$1 = function(_) {
  var this__7350 = this;
  return this__7350.a.length - this__7350.i
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(_) {
  var this__7351 = this;
  return this__7351.a[this__7351.i]
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(_) {
  var this__7352 = this;
  if(this__7352.i + 1 < this__7352.a.length) {
    return new cljs.core.IndexedSeq(this__7352.a, this__7352.i + 1)
  }else {
    return cljs.core.list.call(null)
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__7353 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.IndexedSeq.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__7354 = this;
  var i__7355 = n + this__7354.i;
  if(i__7355 < this__7354.a.length) {
    return this__7354.a[i__7355]
  }else {
    return null
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__7356 = this;
  var i__7357 = n + this__7356.i;
  if(i__7357 < this__7356.a.length) {
    return this__7356.a[i__7357]
  }else {
    return not_found
  }
};
cljs.core.IndexedSeq;
cljs.core.prim_seq = function() {
  var prim_seq = null;
  var prim_seq__1 = function(prim) {
    return prim_seq.call(null, prim, 0)
  };
  var prim_seq__2 = function(prim, i) {
    if(prim.length === 0) {
      return null
    }else {
      return new cljs.core.IndexedSeq(prim, i)
    }
  };
  prim_seq = function(prim, i) {
    switch(arguments.length) {
      case 1:
        return prim_seq__1.call(this, prim);
      case 2:
        return prim_seq__2.call(this, prim, i)
    }
    throw"Invalid arity: " + arguments.length;
  };
  prim_seq.cljs$lang$arity$1 = prim_seq__1;
  prim_seq.cljs$lang$arity$2 = prim_seq__2;
  return prim_seq
}();
cljs.core.array_seq = function() {
  var array_seq = null;
  var array_seq__1 = function(array) {
    return cljs.core.prim_seq.call(null, array, 0)
  };
  var array_seq__2 = function(array, i) {
    return cljs.core.prim_seq.call(null, array, i)
  };
  array_seq = function(array, i) {
    switch(arguments.length) {
      case 1:
        return array_seq__1.call(this, array);
      case 2:
        return array_seq__2.call(this, array, i)
    }
    throw"Invalid arity: " + arguments.length;
  };
  array_seq.cljs$lang$arity$1 = array_seq__1;
  array_seq.cljs$lang$arity$2 = array_seq__2;
  return array_seq
}();
cljs.core.IReduce["array"] = true;
cljs.core._reduce["array"] = function() {
  var G__7358 = null;
  var G__7358__2 = function(array, f) {
    return cljs.core.ci_reduce.call(null, array, f)
  };
  var G__7358__3 = function(array, f, start) {
    return cljs.core.ci_reduce.call(null, array, f, start)
  };
  G__7358 = function(array, f, start) {
    switch(arguments.length) {
      case 2:
        return G__7358__2.call(this, array, f);
      case 3:
        return G__7358__3.call(this, array, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7358
}();
cljs.core.ILookup["array"] = true;
cljs.core._lookup["array"] = function() {
  var G__7359 = null;
  var G__7359__2 = function(array, k) {
    return array[k]
  };
  var G__7359__3 = function(array, k, not_found) {
    return cljs.core._nth.call(null, array, k, not_found)
  };
  G__7359 = function(array, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__7359__2.call(this, array, k);
      case 3:
        return G__7359__3.call(this, array, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7359
}();
cljs.core.IIndexed["array"] = true;
cljs.core._nth["array"] = function() {
  var G__7360 = null;
  var G__7360__2 = function(array, n) {
    if(n < array.length) {
      return array[n]
    }else {
      return null
    }
  };
  var G__7360__3 = function(array, n, not_found) {
    if(n < array.length) {
      return array[n]
    }else {
      return not_found
    }
  };
  G__7360 = function(array, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__7360__2.call(this, array, n);
      case 3:
        return G__7360__3.call(this, array, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7360
}();
cljs.core.ICounted["array"] = true;
cljs.core._count["array"] = function(a) {
  return a.length
};
cljs.core.ISeqable["array"] = true;
cljs.core._seq["array"] = function(array) {
  return cljs.core.array_seq.call(null, array, 0)
};
cljs.core.RSeq = function(ci, i, meta) {
  this.ci = ci;
  this.i = i;
  this.meta = meta;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31850570
};
cljs.core.RSeq.cljs$lang$type = true;
cljs.core.RSeq.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/RSeq")
};
cljs.core.RSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__7361 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.RSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__7362 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.RSeq.prototype.toString = function() {
  var this__7363 = this;
  var this__7364 = this;
  return cljs.core.pr_str.call(null, this__7364)
};
cljs.core.RSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__7365 = this;
  return coll
};
cljs.core.RSeq.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__7366 = this;
  return this__7366.i + 1
};
cljs.core.RSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__7367 = this;
  return cljs.core._nth.call(null, this__7367.ci, this__7367.i)
};
cljs.core.RSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__7368 = this;
  if(this__7368.i > 0) {
    return new cljs.core.RSeq(this__7368.ci, this__7368.i - 1, null)
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.RSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__7369 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.RSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, new_meta) {
  var this__7370 = this;
  return new cljs.core.RSeq(this__7370.ci, this__7370.i, new_meta)
};
cljs.core.RSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__7371 = this;
  return this__7371.meta
};
cljs.core.RSeq;
cljs.core.seq = function seq(coll) {
  if(coll == null) {
    return null
  }else {
    if(function() {
      var G__7375__7376 = coll;
      if(G__7375__7376) {
        if(function() {
          var or__3824__auto____7377 = G__7375__7376.cljs$lang$protocol_mask$partition0$ & 32;
          if(or__3824__auto____7377) {
            return or__3824__auto____7377
          }else {
            return G__7375__7376.cljs$core$ASeq$
          }
        }()) {
          return true
        }else {
          if(!G__7375__7376.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.ASeq, G__7375__7376)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.ASeq, G__7375__7376)
      }
    }()) {
      return coll
    }else {
      return cljs.core._seq.call(null, coll)
    }
  }
};
cljs.core.first = function first(coll) {
  if(coll == null) {
    return null
  }else {
    if(function() {
      var G__7382__7383 = coll;
      if(G__7382__7383) {
        if(function() {
          var or__3824__auto____7384 = G__7382__7383.cljs$lang$protocol_mask$partition0$ & 64;
          if(or__3824__auto____7384) {
            return or__3824__auto____7384
          }else {
            return G__7382__7383.cljs$core$ISeq$
          }
        }()) {
          return true
        }else {
          if(!G__7382__7383.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__7382__7383)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__7382__7383)
      }
    }()) {
      return cljs.core._first.call(null, coll)
    }else {
      var s__7385 = cljs.core.seq.call(null, coll);
      if(s__7385 == null) {
        return null
      }else {
        return cljs.core._first.call(null, s__7385)
      }
    }
  }
};
cljs.core.rest = function rest(coll) {
  if(!(coll == null)) {
    if(function() {
      var G__7390__7391 = coll;
      if(G__7390__7391) {
        if(function() {
          var or__3824__auto____7392 = G__7390__7391.cljs$lang$protocol_mask$partition0$ & 64;
          if(or__3824__auto____7392) {
            return or__3824__auto____7392
          }else {
            return G__7390__7391.cljs$core$ISeq$
          }
        }()) {
          return true
        }else {
          if(!G__7390__7391.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__7390__7391)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__7390__7391)
      }
    }()) {
      return cljs.core._rest.call(null, coll)
    }else {
      var s__7393 = cljs.core.seq.call(null, coll);
      if(!(s__7393 == null)) {
        return cljs.core._rest.call(null, s__7393)
      }else {
        return cljs.core.List.EMPTY
      }
    }
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.next = function next(coll) {
  if(coll == null) {
    return null
  }else {
    if(function() {
      var G__7397__7398 = coll;
      if(G__7397__7398) {
        if(function() {
          var or__3824__auto____7399 = G__7397__7398.cljs$lang$protocol_mask$partition0$ & 128;
          if(or__3824__auto____7399) {
            return or__3824__auto____7399
          }else {
            return G__7397__7398.cljs$core$INext$
          }
        }()) {
          return true
        }else {
          if(!G__7397__7398.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.INext, G__7397__7398)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.INext, G__7397__7398)
      }
    }()) {
      return cljs.core._next.call(null, coll)
    }else {
      return cljs.core.seq.call(null, cljs.core.rest.call(null, coll))
    }
  }
};
cljs.core.second = function second(coll) {
  return cljs.core.first.call(null, cljs.core.next.call(null, coll))
};
cljs.core.ffirst = function ffirst(coll) {
  return cljs.core.first.call(null, cljs.core.first.call(null, coll))
};
cljs.core.nfirst = function nfirst(coll) {
  return cljs.core.next.call(null, cljs.core.first.call(null, coll))
};
cljs.core.fnext = function fnext(coll) {
  return cljs.core.first.call(null, cljs.core.next.call(null, coll))
};
cljs.core.nnext = function nnext(coll) {
  return cljs.core.next.call(null, cljs.core.next.call(null, coll))
};
cljs.core.last = function last(s) {
  while(true) {
    var sn__7401 = cljs.core.next.call(null, s);
    if(!(sn__7401 == null)) {
      var G__7402 = sn__7401;
      s = G__7402;
      continue
    }else {
      return cljs.core.first.call(null, s)
    }
    break
  }
};
cljs.core.IEquiv["_"] = true;
cljs.core._equiv["_"] = function(x, o) {
  return x === o
};
cljs.core.not = function not(x) {
  if(cljs.core.truth_(x)) {
    return false
  }else {
    return true
  }
};
cljs.core.conj = function() {
  var conj = null;
  var conj__2 = function(coll, x) {
    return cljs.core._conj.call(null, coll, x)
  };
  var conj__3 = function() {
    var G__7403__delegate = function(coll, x, xs) {
      while(true) {
        if(cljs.core.truth_(xs)) {
          var G__7404 = conj.call(null, coll, x);
          var G__7405 = cljs.core.first.call(null, xs);
          var G__7406 = cljs.core.next.call(null, xs);
          coll = G__7404;
          x = G__7405;
          xs = G__7406;
          continue
        }else {
          return conj.call(null, coll, x)
        }
        break
      }
    };
    var G__7403 = function(coll, x, var_args) {
      var xs = null;
      if(goog.isDef(var_args)) {
        xs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7403__delegate.call(this, coll, x, xs)
    };
    G__7403.cljs$lang$maxFixedArity = 2;
    G__7403.cljs$lang$applyTo = function(arglist__7407) {
      var coll = cljs.core.first(arglist__7407);
      var x = cljs.core.first(cljs.core.next(arglist__7407));
      var xs = cljs.core.rest(cljs.core.next(arglist__7407));
      return G__7403__delegate(coll, x, xs)
    };
    G__7403.cljs$lang$arity$variadic = G__7403__delegate;
    return G__7403
  }();
  conj = function(coll, x, var_args) {
    var xs = var_args;
    switch(arguments.length) {
      case 2:
        return conj__2.call(this, coll, x);
      default:
        return conj__3.cljs$lang$arity$variadic(coll, x, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  conj.cljs$lang$maxFixedArity = 2;
  conj.cljs$lang$applyTo = conj__3.cljs$lang$applyTo;
  conj.cljs$lang$arity$2 = conj__2;
  conj.cljs$lang$arity$variadic = conj__3.cljs$lang$arity$variadic;
  return conj
}();
cljs.core.empty = function empty(coll) {
  return cljs.core._empty.call(null, coll)
};
cljs.core.accumulating_seq_count = function accumulating_seq_count(coll) {
  var s__7410 = cljs.core.seq.call(null, coll);
  var acc__7411 = 0;
  while(true) {
    if(cljs.core.counted_QMARK_.call(null, s__7410)) {
      return acc__7411 + cljs.core._count.call(null, s__7410)
    }else {
      var G__7412 = cljs.core.next.call(null, s__7410);
      var G__7413 = acc__7411 + 1;
      s__7410 = G__7412;
      acc__7411 = G__7413;
      continue
    }
    break
  }
};
cljs.core.count = function count(coll) {
  if(cljs.core.counted_QMARK_.call(null, coll)) {
    return cljs.core._count.call(null, coll)
  }else {
    return cljs.core.accumulating_seq_count.call(null, coll)
  }
};
cljs.core.linear_traversal_nth = function() {
  var linear_traversal_nth = null;
  var linear_traversal_nth__2 = function(coll, n) {
    if(coll == null) {
      throw new Error("Index out of bounds");
    }else {
      if(n === 0) {
        if(cljs.core.seq.call(null, coll)) {
          return cljs.core.first.call(null, coll)
        }else {
          throw new Error("Index out of bounds");
        }
      }else {
        if(cljs.core.indexed_QMARK_.call(null, coll)) {
          return cljs.core._nth.call(null, coll, n)
        }else {
          if(cljs.core.seq.call(null, coll)) {
            return linear_traversal_nth.call(null, cljs.core.next.call(null, coll), n - 1)
          }else {
            if("\ufdd0'else") {
              throw new Error("Index out of bounds");
            }else {
              return null
            }
          }
        }
      }
    }
  };
  var linear_traversal_nth__3 = function(coll, n, not_found) {
    if(coll == null) {
      return not_found
    }else {
      if(n === 0) {
        if(cljs.core.seq.call(null, coll)) {
          return cljs.core.first.call(null, coll)
        }else {
          return not_found
        }
      }else {
        if(cljs.core.indexed_QMARK_.call(null, coll)) {
          return cljs.core._nth.call(null, coll, n, not_found)
        }else {
          if(cljs.core.seq.call(null, coll)) {
            return linear_traversal_nth.call(null, cljs.core.next.call(null, coll), n - 1, not_found)
          }else {
            if("\ufdd0'else") {
              return not_found
            }else {
              return null
            }
          }
        }
      }
    }
  };
  linear_traversal_nth = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return linear_traversal_nth__2.call(this, coll, n);
      case 3:
        return linear_traversal_nth__3.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  linear_traversal_nth.cljs$lang$arity$2 = linear_traversal_nth__2;
  linear_traversal_nth.cljs$lang$arity$3 = linear_traversal_nth__3;
  return linear_traversal_nth
}();
cljs.core.nth = function() {
  var nth = null;
  var nth__2 = function(coll, n) {
    if(coll == null) {
      return null
    }else {
      if(function() {
        var G__7420__7421 = coll;
        if(G__7420__7421) {
          if(function() {
            var or__3824__auto____7422 = G__7420__7421.cljs$lang$protocol_mask$partition0$ & 16;
            if(or__3824__auto____7422) {
              return or__3824__auto____7422
            }else {
              return G__7420__7421.cljs$core$IIndexed$
            }
          }()) {
            return true
          }else {
            if(!G__7420__7421.cljs$lang$protocol_mask$partition0$) {
              return cljs.core.type_satisfies_.call(null, cljs.core.IIndexed, G__7420__7421)
            }else {
              return false
            }
          }
        }else {
          return cljs.core.type_satisfies_.call(null, cljs.core.IIndexed, G__7420__7421)
        }
      }()) {
        return cljs.core._nth.call(null, coll, Math.floor(n))
      }else {
        return cljs.core.linear_traversal_nth.call(null, coll, Math.floor(n))
      }
    }
  };
  var nth__3 = function(coll, n, not_found) {
    if(!(coll == null)) {
      if(function() {
        var G__7423__7424 = coll;
        if(G__7423__7424) {
          if(function() {
            var or__3824__auto____7425 = G__7423__7424.cljs$lang$protocol_mask$partition0$ & 16;
            if(or__3824__auto____7425) {
              return or__3824__auto____7425
            }else {
              return G__7423__7424.cljs$core$IIndexed$
            }
          }()) {
            return true
          }else {
            if(!G__7423__7424.cljs$lang$protocol_mask$partition0$) {
              return cljs.core.type_satisfies_.call(null, cljs.core.IIndexed, G__7423__7424)
            }else {
              return false
            }
          }
        }else {
          return cljs.core.type_satisfies_.call(null, cljs.core.IIndexed, G__7423__7424)
        }
      }()) {
        return cljs.core._nth.call(null, coll, Math.floor(n), not_found)
      }else {
        return cljs.core.linear_traversal_nth.call(null, coll, Math.floor(n), not_found)
      }
    }else {
      return not_found
    }
  };
  nth = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return nth__2.call(this, coll, n);
      case 3:
        return nth__3.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  nth.cljs$lang$arity$2 = nth__2;
  nth.cljs$lang$arity$3 = nth__3;
  return nth
}();
cljs.core.get = function() {
  var get = null;
  var get__2 = function(o, k) {
    return cljs.core._lookup.call(null, o, k)
  };
  var get__3 = function(o, k, not_found) {
    return cljs.core._lookup.call(null, o, k, not_found)
  };
  get = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return get__2.call(this, o, k);
      case 3:
        return get__3.call(this, o, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  get.cljs$lang$arity$2 = get__2;
  get.cljs$lang$arity$3 = get__3;
  return get
}();
cljs.core.assoc = function() {
  var assoc = null;
  var assoc__3 = function(coll, k, v) {
    return cljs.core._assoc.call(null, coll, k, v)
  };
  var assoc__4 = function() {
    var G__7428__delegate = function(coll, k, v, kvs) {
      while(true) {
        var ret__7427 = assoc.call(null, coll, k, v);
        if(cljs.core.truth_(kvs)) {
          var G__7429 = ret__7427;
          var G__7430 = cljs.core.first.call(null, kvs);
          var G__7431 = cljs.core.second.call(null, kvs);
          var G__7432 = cljs.core.nnext.call(null, kvs);
          coll = G__7429;
          k = G__7430;
          v = G__7431;
          kvs = G__7432;
          continue
        }else {
          return ret__7427
        }
        break
      }
    };
    var G__7428 = function(coll, k, v, var_args) {
      var kvs = null;
      if(goog.isDef(var_args)) {
        kvs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__7428__delegate.call(this, coll, k, v, kvs)
    };
    G__7428.cljs$lang$maxFixedArity = 3;
    G__7428.cljs$lang$applyTo = function(arglist__7433) {
      var coll = cljs.core.first(arglist__7433);
      var k = cljs.core.first(cljs.core.next(arglist__7433));
      var v = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7433)));
      var kvs = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7433)));
      return G__7428__delegate(coll, k, v, kvs)
    };
    G__7428.cljs$lang$arity$variadic = G__7428__delegate;
    return G__7428
  }();
  assoc = function(coll, k, v, var_args) {
    var kvs = var_args;
    switch(arguments.length) {
      case 3:
        return assoc__3.call(this, coll, k, v);
      default:
        return assoc__4.cljs$lang$arity$variadic(coll, k, v, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  assoc.cljs$lang$maxFixedArity = 3;
  assoc.cljs$lang$applyTo = assoc__4.cljs$lang$applyTo;
  assoc.cljs$lang$arity$3 = assoc__3;
  assoc.cljs$lang$arity$variadic = assoc__4.cljs$lang$arity$variadic;
  return assoc
}();
cljs.core.dissoc = function() {
  var dissoc = null;
  var dissoc__1 = function(coll) {
    return coll
  };
  var dissoc__2 = function(coll, k) {
    return cljs.core._dissoc.call(null, coll, k)
  };
  var dissoc__3 = function() {
    var G__7436__delegate = function(coll, k, ks) {
      while(true) {
        var ret__7435 = dissoc.call(null, coll, k);
        if(cljs.core.truth_(ks)) {
          var G__7437 = ret__7435;
          var G__7438 = cljs.core.first.call(null, ks);
          var G__7439 = cljs.core.next.call(null, ks);
          coll = G__7437;
          k = G__7438;
          ks = G__7439;
          continue
        }else {
          return ret__7435
        }
        break
      }
    };
    var G__7436 = function(coll, k, var_args) {
      var ks = null;
      if(goog.isDef(var_args)) {
        ks = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7436__delegate.call(this, coll, k, ks)
    };
    G__7436.cljs$lang$maxFixedArity = 2;
    G__7436.cljs$lang$applyTo = function(arglist__7440) {
      var coll = cljs.core.first(arglist__7440);
      var k = cljs.core.first(cljs.core.next(arglist__7440));
      var ks = cljs.core.rest(cljs.core.next(arglist__7440));
      return G__7436__delegate(coll, k, ks)
    };
    G__7436.cljs$lang$arity$variadic = G__7436__delegate;
    return G__7436
  }();
  dissoc = function(coll, k, var_args) {
    var ks = var_args;
    switch(arguments.length) {
      case 1:
        return dissoc__1.call(this, coll);
      case 2:
        return dissoc__2.call(this, coll, k);
      default:
        return dissoc__3.cljs$lang$arity$variadic(coll, k, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  dissoc.cljs$lang$maxFixedArity = 2;
  dissoc.cljs$lang$applyTo = dissoc__3.cljs$lang$applyTo;
  dissoc.cljs$lang$arity$1 = dissoc__1;
  dissoc.cljs$lang$arity$2 = dissoc__2;
  dissoc.cljs$lang$arity$variadic = dissoc__3.cljs$lang$arity$variadic;
  return dissoc
}();
cljs.core.with_meta = function with_meta(o, meta) {
  return cljs.core._with_meta.call(null, o, meta)
};
cljs.core.meta = function meta(o) {
  if(function() {
    var G__7444__7445 = o;
    if(G__7444__7445) {
      if(function() {
        var or__3824__auto____7446 = G__7444__7445.cljs$lang$protocol_mask$partition0$ & 131072;
        if(or__3824__auto____7446) {
          return or__3824__auto____7446
        }else {
          return G__7444__7445.cljs$core$IMeta$
        }
      }()) {
        return true
      }else {
        if(!G__7444__7445.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.IMeta, G__7444__7445)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IMeta, G__7444__7445)
    }
  }()) {
    return cljs.core._meta.call(null, o)
  }else {
    return null
  }
};
cljs.core.peek = function peek(coll) {
  return cljs.core._peek.call(null, coll)
};
cljs.core.pop = function pop(coll) {
  return cljs.core._pop.call(null, coll)
};
cljs.core.disj = function() {
  var disj = null;
  var disj__1 = function(coll) {
    return coll
  };
  var disj__2 = function(coll, k) {
    return cljs.core._disjoin.call(null, coll, k)
  };
  var disj__3 = function() {
    var G__7449__delegate = function(coll, k, ks) {
      while(true) {
        var ret__7448 = disj.call(null, coll, k);
        if(cljs.core.truth_(ks)) {
          var G__7450 = ret__7448;
          var G__7451 = cljs.core.first.call(null, ks);
          var G__7452 = cljs.core.next.call(null, ks);
          coll = G__7450;
          k = G__7451;
          ks = G__7452;
          continue
        }else {
          return ret__7448
        }
        break
      }
    };
    var G__7449 = function(coll, k, var_args) {
      var ks = null;
      if(goog.isDef(var_args)) {
        ks = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7449__delegate.call(this, coll, k, ks)
    };
    G__7449.cljs$lang$maxFixedArity = 2;
    G__7449.cljs$lang$applyTo = function(arglist__7453) {
      var coll = cljs.core.first(arglist__7453);
      var k = cljs.core.first(cljs.core.next(arglist__7453));
      var ks = cljs.core.rest(cljs.core.next(arglist__7453));
      return G__7449__delegate(coll, k, ks)
    };
    G__7449.cljs$lang$arity$variadic = G__7449__delegate;
    return G__7449
  }();
  disj = function(coll, k, var_args) {
    var ks = var_args;
    switch(arguments.length) {
      case 1:
        return disj__1.call(this, coll);
      case 2:
        return disj__2.call(this, coll, k);
      default:
        return disj__3.cljs$lang$arity$variadic(coll, k, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  disj.cljs$lang$maxFixedArity = 2;
  disj.cljs$lang$applyTo = disj__3.cljs$lang$applyTo;
  disj.cljs$lang$arity$1 = disj__1;
  disj.cljs$lang$arity$2 = disj__2;
  disj.cljs$lang$arity$variadic = disj__3.cljs$lang$arity$variadic;
  return disj
}();
cljs.core.string_hash_cache = {};
cljs.core.string_hash_cache_count = 0;
cljs.core.add_to_string_hash_cache = function add_to_string_hash_cache(k) {
  var h__7455 = goog.string.hashCode(k);
  cljs.core.string_hash_cache[k] = h__7455;
  cljs.core.string_hash_cache_count = cljs.core.string_hash_cache_count + 1;
  return h__7455
};
cljs.core.check_string_hash_cache = function check_string_hash_cache(k) {
  if(cljs.core.string_hash_cache_count > 255) {
    cljs.core.string_hash_cache = {};
    cljs.core.string_hash_cache_count = 0
  }else {
  }
  var h__7457 = cljs.core.string_hash_cache[k];
  if(!(h__7457 == null)) {
    return h__7457
  }else {
    return cljs.core.add_to_string_hash_cache.call(null, k)
  }
};
cljs.core.hash = function() {
  var hash = null;
  var hash__1 = function(o) {
    return hash.call(null, o, true)
  };
  var hash__2 = function(o, check_cache) {
    if(function() {
      var and__3822__auto____7459 = goog.isString(o);
      if(and__3822__auto____7459) {
        return check_cache
      }else {
        return and__3822__auto____7459
      }
    }()) {
      return cljs.core.check_string_hash_cache.call(null, o)
    }else {
      return cljs.core._hash.call(null, o)
    }
  };
  hash = function(o, check_cache) {
    switch(arguments.length) {
      case 1:
        return hash__1.call(this, o);
      case 2:
        return hash__2.call(this, o, check_cache)
    }
    throw"Invalid arity: " + arguments.length;
  };
  hash.cljs$lang$arity$1 = hash__1;
  hash.cljs$lang$arity$2 = hash__2;
  return hash
}();
cljs.core.empty_QMARK_ = function empty_QMARK_(coll) {
  return cljs.core.not.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.coll_QMARK_ = function coll_QMARK_(x) {
  if(x == null) {
    return false
  }else {
    var G__7463__7464 = x;
    if(G__7463__7464) {
      if(function() {
        var or__3824__auto____7465 = G__7463__7464.cljs$lang$protocol_mask$partition0$ & 8;
        if(or__3824__auto____7465) {
          return or__3824__auto____7465
        }else {
          return G__7463__7464.cljs$core$ICollection$
        }
      }()) {
        return true
      }else {
        if(!G__7463__7464.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.ICollection, G__7463__7464)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.ICollection, G__7463__7464)
    }
  }
};
cljs.core.set_QMARK_ = function set_QMARK_(x) {
  if(x == null) {
    return false
  }else {
    var G__7469__7470 = x;
    if(G__7469__7470) {
      if(function() {
        var or__3824__auto____7471 = G__7469__7470.cljs$lang$protocol_mask$partition0$ & 4096;
        if(or__3824__auto____7471) {
          return or__3824__auto____7471
        }else {
          return G__7469__7470.cljs$core$ISet$
        }
      }()) {
        return true
      }else {
        if(!G__7469__7470.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.ISet, G__7469__7470)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.ISet, G__7469__7470)
    }
  }
};
cljs.core.associative_QMARK_ = function associative_QMARK_(x) {
  var G__7475__7476 = x;
  if(G__7475__7476) {
    if(function() {
      var or__3824__auto____7477 = G__7475__7476.cljs$lang$protocol_mask$partition0$ & 512;
      if(or__3824__auto____7477) {
        return or__3824__auto____7477
      }else {
        return G__7475__7476.cljs$core$IAssociative$
      }
    }()) {
      return true
    }else {
      if(!G__7475__7476.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IAssociative, G__7475__7476)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IAssociative, G__7475__7476)
  }
};
cljs.core.sequential_QMARK_ = function sequential_QMARK_(x) {
  var G__7481__7482 = x;
  if(G__7481__7482) {
    if(function() {
      var or__3824__auto____7483 = G__7481__7482.cljs$lang$protocol_mask$partition0$ & 16777216;
      if(or__3824__auto____7483) {
        return or__3824__auto____7483
      }else {
        return G__7481__7482.cljs$core$ISequential$
      }
    }()) {
      return true
    }else {
      if(!G__7481__7482.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.ISequential, G__7481__7482)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.ISequential, G__7481__7482)
  }
};
cljs.core.counted_QMARK_ = function counted_QMARK_(x) {
  var G__7487__7488 = x;
  if(G__7487__7488) {
    if(function() {
      var or__3824__auto____7489 = G__7487__7488.cljs$lang$protocol_mask$partition0$ & 2;
      if(or__3824__auto____7489) {
        return or__3824__auto____7489
      }else {
        return G__7487__7488.cljs$core$ICounted$
      }
    }()) {
      return true
    }else {
      if(!G__7487__7488.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.ICounted, G__7487__7488)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.ICounted, G__7487__7488)
  }
};
cljs.core.indexed_QMARK_ = function indexed_QMARK_(x) {
  var G__7493__7494 = x;
  if(G__7493__7494) {
    if(function() {
      var or__3824__auto____7495 = G__7493__7494.cljs$lang$protocol_mask$partition0$ & 16;
      if(or__3824__auto____7495) {
        return or__3824__auto____7495
      }else {
        return G__7493__7494.cljs$core$IIndexed$
      }
    }()) {
      return true
    }else {
      if(!G__7493__7494.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IIndexed, G__7493__7494)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IIndexed, G__7493__7494)
  }
};
cljs.core.reduceable_QMARK_ = function reduceable_QMARK_(x) {
  var G__7499__7500 = x;
  if(G__7499__7500) {
    if(function() {
      var or__3824__auto____7501 = G__7499__7500.cljs$lang$protocol_mask$partition0$ & 524288;
      if(or__3824__auto____7501) {
        return or__3824__auto____7501
      }else {
        return G__7499__7500.cljs$core$IReduce$
      }
    }()) {
      return true
    }else {
      if(!G__7499__7500.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IReduce, G__7499__7500)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IReduce, G__7499__7500)
  }
};
cljs.core.map_QMARK_ = function map_QMARK_(x) {
  if(x == null) {
    return false
  }else {
    var G__7505__7506 = x;
    if(G__7505__7506) {
      if(function() {
        var or__3824__auto____7507 = G__7505__7506.cljs$lang$protocol_mask$partition0$ & 1024;
        if(or__3824__auto____7507) {
          return or__3824__auto____7507
        }else {
          return G__7505__7506.cljs$core$IMap$
        }
      }()) {
        return true
      }else {
        if(!G__7505__7506.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.IMap, G__7505__7506)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IMap, G__7505__7506)
    }
  }
};
cljs.core.vector_QMARK_ = function vector_QMARK_(x) {
  var G__7511__7512 = x;
  if(G__7511__7512) {
    if(function() {
      var or__3824__auto____7513 = G__7511__7512.cljs$lang$protocol_mask$partition0$ & 16384;
      if(or__3824__auto____7513) {
        return or__3824__auto____7513
      }else {
        return G__7511__7512.cljs$core$IVector$
      }
    }()) {
      return true
    }else {
      if(!G__7511__7512.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IVector, G__7511__7512)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IVector, G__7511__7512)
  }
};
cljs.core.chunked_seq_QMARK_ = function chunked_seq_QMARK_(x) {
  var G__7517__7518 = x;
  if(G__7517__7518) {
    if(cljs.core.truth_(function() {
      var or__3824__auto____7519 = null;
      if(cljs.core.truth_(or__3824__auto____7519)) {
        return or__3824__auto____7519
      }else {
        return G__7517__7518.cljs$core$IChunkedSeq$
      }
    }())) {
      return true
    }else {
      if(!G__7517__7518.cljs$lang$protocol_mask$partition$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IChunkedSeq, G__7517__7518)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IChunkedSeq, G__7517__7518)
  }
};
cljs.core.js_obj = function() {
  var js_obj = null;
  var js_obj__0 = function() {
    return{}
  };
  var js_obj__1 = function() {
    var G__7520__delegate = function(keyvals) {
      return cljs.core.apply.call(null, goog.object.create, keyvals)
    };
    var G__7520 = function(var_args) {
      var keyvals = null;
      if(goog.isDef(var_args)) {
        keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
      }
      return G__7520__delegate.call(this, keyvals)
    };
    G__7520.cljs$lang$maxFixedArity = 0;
    G__7520.cljs$lang$applyTo = function(arglist__7521) {
      var keyvals = cljs.core.seq(arglist__7521);
      return G__7520__delegate(keyvals)
    };
    G__7520.cljs$lang$arity$variadic = G__7520__delegate;
    return G__7520
  }();
  js_obj = function(var_args) {
    var keyvals = var_args;
    switch(arguments.length) {
      case 0:
        return js_obj__0.call(this);
      default:
        return js_obj__1.cljs$lang$arity$variadic(cljs.core.array_seq(arguments, 0))
    }
    throw"Invalid arity: " + arguments.length;
  };
  js_obj.cljs$lang$maxFixedArity = 0;
  js_obj.cljs$lang$applyTo = js_obj__1.cljs$lang$applyTo;
  js_obj.cljs$lang$arity$0 = js_obj__0;
  js_obj.cljs$lang$arity$variadic = js_obj__1.cljs$lang$arity$variadic;
  return js_obj
}();
cljs.core.js_keys = function js_keys(obj) {
  var keys__7523 = [];
  goog.object.forEach(obj, function(val, key, obj) {
    return keys__7523.push(key)
  });
  return keys__7523
};
cljs.core.js_delete = function js_delete(obj, key) {
  return delete obj[key]
};
cljs.core.array_copy = function array_copy(from, i, to, j, len) {
  var i__7527 = i;
  var j__7528 = j;
  var len__7529 = len;
  while(true) {
    if(len__7529 === 0) {
      return to
    }else {
      to[j__7528] = from[i__7527];
      var G__7530 = i__7527 + 1;
      var G__7531 = j__7528 + 1;
      var G__7532 = len__7529 - 1;
      i__7527 = G__7530;
      j__7528 = G__7531;
      len__7529 = G__7532;
      continue
    }
    break
  }
};
cljs.core.array_copy_downward = function array_copy_downward(from, i, to, j, len) {
  var i__7536 = i + (len - 1);
  var j__7537 = j + (len - 1);
  var len__7538 = len;
  while(true) {
    if(len__7538 === 0) {
      return to
    }else {
      to[j__7537] = from[i__7536];
      var G__7539 = i__7536 - 1;
      var G__7540 = j__7537 - 1;
      var G__7541 = len__7538 - 1;
      i__7536 = G__7539;
      j__7537 = G__7540;
      len__7538 = G__7541;
      continue
    }
    break
  }
};
cljs.core.lookup_sentinel = {};
cljs.core.false_QMARK_ = function false_QMARK_(x) {
  return x === false
};
cljs.core.true_QMARK_ = function true_QMARK_(x) {
  return x === true
};
cljs.core.undefined_QMARK_ = function undefined_QMARK_(x) {
  return void 0 === x
};
cljs.core.seq_QMARK_ = function seq_QMARK_(s) {
  if(s == null) {
    return false
  }else {
    var G__7545__7546 = s;
    if(G__7545__7546) {
      if(function() {
        var or__3824__auto____7547 = G__7545__7546.cljs$lang$protocol_mask$partition0$ & 64;
        if(or__3824__auto____7547) {
          return or__3824__auto____7547
        }else {
          return G__7545__7546.cljs$core$ISeq$
        }
      }()) {
        return true
      }else {
        if(!G__7545__7546.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__7545__7546)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__7545__7546)
    }
  }
};
cljs.core.seqable_QMARK_ = function seqable_QMARK_(s) {
  var G__7551__7552 = s;
  if(G__7551__7552) {
    if(function() {
      var or__3824__auto____7553 = G__7551__7552.cljs$lang$protocol_mask$partition0$ & 8388608;
      if(or__3824__auto____7553) {
        return or__3824__auto____7553
      }else {
        return G__7551__7552.cljs$core$ISeqable$
      }
    }()) {
      return true
    }else {
      if(!G__7551__7552.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.ISeqable, G__7551__7552)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.ISeqable, G__7551__7552)
  }
};
cljs.core.boolean$ = function boolean$(x) {
  if(cljs.core.truth_(x)) {
    return true
  }else {
    return false
  }
};
cljs.core.string_QMARK_ = function string_QMARK_(x) {
  var and__3822__auto____7556 = goog.isString(x);
  if(and__3822__auto____7556) {
    return!function() {
      var or__3824__auto____7557 = x.charAt(0) === "\ufdd0";
      if(or__3824__auto____7557) {
        return or__3824__auto____7557
      }else {
        return x.charAt(0) === "\ufdd1"
      }
    }()
  }else {
    return and__3822__auto____7556
  }
};
cljs.core.keyword_QMARK_ = function keyword_QMARK_(x) {
  var and__3822__auto____7559 = goog.isString(x);
  if(and__3822__auto____7559) {
    return x.charAt(0) === "\ufdd0"
  }else {
    return and__3822__auto____7559
  }
};
cljs.core.symbol_QMARK_ = function symbol_QMARK_(x) {
  var and__3822__auto____7561 = goog.isString(x);
  if(and__3822__auto____7561) {
    return x.charAt(0) === "\ufdd1"
  }else {
    return and__3822__auto____7561
  }
};
cljs.core.number_QMARK_ = function number_QMARK_(n) {
  return goog.isNumber(n)
};
cljs.core.fn_QMARK_ = function fn_QMARK_(f) {
  return goog.isFunction(f)
};
cljs.core.ifn_QMARK_ = function ifn_QMARK_(f) {
  var or__3824__auto____7566 = cljs.core.fn_QMARK_.call(null, f);
  if(or__3824__auto____7566) {
    return or__3824__auto____7566
  }else {
    var G__7567__7568 = f;
    if(G__7567__7568) {
      if(function() {
        var or__3824__auto____7569 = G__7567__7568.cljs$lang$protocol_mask$partition0$ & 1;
        if(or__3824__auto____7569) {
          return or__3824__auto____7569
        }else {
          return G__7567__7568.cljs$core$IFn$
        }
      }()) {
        return true
      }else {
        if(!G__7567__7568.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.IFn, G__7567__7568)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IFn, G__7567__7568)
    }
  }
};
cljs.core.integer_QMARK_ = function integer_QMARK_(n) {
  var and__3822__auto____7571 = cljs.core.number_QMARK_.call(null, n);
  if(and__3822__auto____7571) {
    return n == n.toFixed()
  }else {
    return and__3822__auto____7571
  }
};
cljs.core.contains_QMARK_ = function contains_QMARK_(coll, v) {
  if(cljs.core._lookup.call(null, coll, v, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
    return false
  }else {
    return true
  }
};
cljs.core.find = function find(coll, k) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____7574 = coll;
    if(cljs.core.truth_(and__3822__auto____7574)) {
      var and__3822__auto____7575 = cljs.core.associative_QMARK_.call(null, coll);
      if(and__3822__auto____7575) {
        return cljs.core.contains_QMARK_.call(null, coll, k)
      }else {
        return and__3822__auto____7575
      }
    }else {
      return and__3822__auto____7574
    }
  }())) {
    return cljs.core.PersistentVector.fromArray([k, cljs.core._lookup.call(null, coll, k)], true)
  }else {
    return null
  }
};
cljs.core.distinct_QMARK_ = function() {
  var distinct_QMARK_ = null;
  var distinct_QMARK___1 = function(x) {
    return true
  };
  var distinct_QMARK___2 = function(x, y) {
    return!cljs.core._EQ_.call(null, x, y)
  };
  var distinct_QMARK___3 = function() {
    var G__7584__delegate = function(x, y, more) {
      if(!cljs.core._EQ_.call(null, x, y)) {
        var s__7580 = cljs.core.PersistentHashSet.fromArray([y, x]);
        var xs__7581 = more;
        while(true) {
          var x__7582 = cljs.core.first.call(null, xs__7581);
          var etc__7583 = cljs.core.next.call(null, xs__7581);
          if(cljs.core.truth_(xs__7581)) {
            if(cljs.core.contains_QMARK_.call(null, s__7580, x__7582)) {
              return false
            }else {
              var G__7585 = cljs.core.conj.call(null, s__7580, x__7582);
              var G__7586 = etc__7583;
              s__7580 = G__7585;
              xs__7581 = G__7586;
              continue
            }
          }else {
            return true
          }
          break
        }
      }else {
        return false
      }
    };
    var G__7584 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7584__delegate.call(this, x, y, more)
    };
    G__7584.cljs$lang$maxFixedArity = 2;
    G__7584.cljs$lang$applyTo = function(arglist__7587) {
      var x = cljs.core.first(arglist__7587);
      var y = cljs.core.first(cljs.core.next(arglist__7587));
      var more = cljs.core.rest(cljs.core.next(arglist__7587));
      return G__7584__delegate(x, y, more)
    };
    G__7584.cljs$lang$arity$variadic = G__7584__delegate;
    return G__7584
  }();
  distinct_QMARK_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return distinct_QMARK___1.call(this, x);
      case 2:
        return distinct_QMARK___2.call(this, x, y);
      default:
        return distinct_QMARK___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  distinct_QMARK_.cljs$lang$maxFixedArity = 2;
  distinct_QMARK_.cljs$lang$applyTo = distinct_QMARK___3.cljs$lang$applyTo;
  distinct_QMARK_.cljs$lang$arity$1 = distinct_QMARK___1;
  distinct_QMARK_.cljs$lang$arity$2 = distinct_QMARK___2;
  distinct_QMARK_.cljs$lang$arity$variadic = distinct_QMARK___3.cljs$lang$arity$variadic;
  return distinct_QMARK_
}();
cljs.core.compare = function compare(x, y) {
  if(x === y) {
    return 0
  }else {
    if(x == null) {
      return-1
    }else {
      if(y == null) {
        return 1
      }else {
        if(cljs.core.type.call(null, x) === cljs.core.type.call(null, y)) {
          if(function() {
            var G__7591__7592 = x;
            if(G__7591__7592) {
              if(cljs.core.truth_(function() {
                var or__3824__auto____7593 = null;
                if(cljs.core.truth_(or__3824__auto____7593)) {
                  return or__3824__auto____7593
                }else {
                  return G__7591__7592.cljs$core$IComparable$
                }
              }())) {
                return true
              }else {
                if(!G__7591__7592.cljs$lang$protocol_mask$partition$) {
                  return cljs.core.type_satisfies_.call(null, cljs.core.IComparable, G__7591__7592)
                }else {
                  return false
                }
              }
            }else {
              return cljs.core.type_satisfies_.call(null, cljs.core.IComparable, G__7591__7592)
            }
          }()) {
            return cljs.core._compare.call(null, x, y)
          }else {
            return goog.array.defaultCompare(x, y)
          }
        }else {
          if("\ufdd0'else") {
            throw new Error("compare on non-nil objects of different types");
          }else {
            return null
          }
        }
      }
    }
  }
};
cljs.core.compare_indexed = function() {
  var compare_indexed = null;
  var compare_indexed__2 = function(xs, ys) {
    var xl__7598 = cljs.core.count.call(null, xs);
    var yl__7599 = cljs.core.count.call(null, ys);
    if(xl__7598 < yl__7599) {
      return-1
    }else {
      if(xl__7598 > yl__7599) {
        return 1
      }else {
        if("\ufdd0'else") {
          return compare_indexed.call(null, xs, ys, xl__7598, 0)
        }else {
          return null
        }
      }
    }
  };
  var compare_indexed__4 = function(xs, ys, len, n) {
    while(true) {
      var d__7600 = cljs.core.compare.call(null, cljs.core.nth.call(null, xs, n), cljs.core.nth.call(null, ys, n));
      if(function() {
        var and__3822__auto____7601 = d__7600 === 0;
        if(and__3822__auto____7601) {
          return n + 1 < len
        }else {
          return and__3822__auto____7601
        }
      }()) {
        var G__7602 = xs;
        var G__7603 = ys;
        var G__7604 = len;
        var G__7605 = n + 1;
        xs = G__7602;
        ys = G__7603;
        len = G__7604;
        n = G__7605;
        continue
      }else {
        return d__7600
      }
      break
    }
  };
  compare_indexed = function(xs, ys, len, n) {
    switch(arguments.length) {
      case 2:
        return compare_indexed__2.call(this, xs, ys);
      case 4:
        return compare_indexed__4.call(this, xs, ys, len, n)
    }
    throw"Invalid arity: " + arguments.length;
  };
  compare_indexed.cljs$lang$arity$2 = compare_indexed__2;
  compare_indexed.cljs$lang$arity$4 = compare_indexed__4;
  return compare_indexed
}();
cljs.core.fn__GT_comparator = function fn__GT_comparator(f) {
  if(cljs.core._EQ_.call(null, f, cljs.core.compare)) {
    return cljs.core.compare
  }else {
    return function(x, y) {
      var r__7607 = f.call(null, x, y);
      if(cljs.core.number_QMARK_.call(null, r__7607)) {
        return r__7607
      }else {
        if(cljs.core.truth_(r__7607)) {
          return-1
        }else {
          if(cljs.core.truth_(f.call(null, y, x))) {
            return 1
          }else {
            return 0
          }
        }
      }
    }
  }
};
cljs.core.sort = function() {
  var sort = null;
  var sort__1 = function(coll) {
    return sort.call(null, cljs.core.compare, coll)
  };
  var sort__2 = function(comp, coll) {
    if(cljs.core.seq.call(null, coll)) {
      var a__7609 = cljs.core.to_array.call(null, coll);
      goog.array.stableSort(a__7609, cljs.core.fn__GT_comparator.call(null, comp));
      return cljs.core.seq.call(null, a__7609)
    }else {
      return cljs.core.List.EMPTY
    }
  };
  sort = function(comp, coll) {
    switch(arguments.length) {
      case 1:
        return sort__1.call(this, comp);
      case 2:
        return sort__2.call(this, comp, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  sort.cljs$lang$arity$1 = sort__1;
  sort.cljs$lang$arity$2 = sort__2;
  return sort
}();
cljs.core.sort_by = function() {
  var sort_by = null;
  var sort_by__2 = function(keyfn, coll) {
    return sort_by.call(null, keyfn, cljs.core.compare, coll)
  };
  var sort_by__3 = function(keyfn, comp, coll) {
    return cljs.core.sort.call(null, function(x, y) {
      return cljs.core.fn__GT_comparator.call(null, comp).call(null, keyfn.call(null, x), keyfn.call(null, y))
    }, coll)
  };
  sort_by = function(keyfn, comp, coll) {
    switch(arguments.length) {
      case 2:
        return sort_by__2.call(this, keyfn, comp);
      case 3:
        return sort_by__3.call(this, keyfn, comp, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  sort_by.cljs$lang$arity$2 = sort_by__2;
  sort_by.cljs$lang$arity$3 = sort_by__3;
  return sort_by
}();
cljs.core.seq_reduce = function() {
  var seq_reduce = null;
  var seq_reduce__2 = function(f, coll) {
    var temp__3971__auto____7615 = cljs.core.seq.call(null, coll);
    if(temp__3971__auto____7615) {
      var s__7616 = temp__3971__auto____7615;
      return cljs.core.reduce.call(null, f, cljs.core.first.call(null, s__7616), cljs.core.next.call(null, s__7616))
    }else {
      return f.call(null)
    }
  };
  var seq_reduce__3 = function(f, val, coll) {
    var val__7617 = val;
    var coll__7618 = cljs.core.seq.call(null, coll);
    while(true) {
      if(coll__7618) {
        var nval__7619 = f.call(null, val__7617, cljs.core.first.call(null, coll__7618));
        if(cljs.core.reduced_QMARK_.call(null, nval__7619)) {
          return cljs.core.deref.call(null, nval__7619)
        }else {
          var G__7620 = nval__7619;
          var G__7621 = cljs.core.next.call(null, coll__7618);
          val__7617 = G__7620;
          coll__7618 = G__7621;
          continue
        }
      }else {
        return val__7617
      }
      break
    }
  };
  seq_reduce = function(f, val, coll) {
    switch(arguments.length) {
      case 2:
        return seq_reduce__2.call(this, f, val);
      case 3:
        return seq_reduce__3.call(this, f, val, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  seq_reduce.cljs$lang$arity$2 = seq_reduce__2;
  seq_reduce.cljs$lang$arity$3 = seq_reduce__3;
  return seq_reduce
}();
cljs.core.shuffle = function shuffle(coll) {
  var a__7623 = cljs.core.to_array.call(null, coll);
  goog.array.shuffle(a__7623);
  return cljs.core.vec.call(null, a__7623)
};
cljs.core.reduce = function() {
  var reduce = null;
  var reduce__2 = function(f, coll) {
    if(function() {
      var G__7630__7631 = coll;
      if(G__7630__7631) {
        if(function() {
          var or__3824__auto____7632 = G__7630__7631.cljs$lang$protocol_mask$partition0$ & 524288;
          if(or__3824__auto____7632) {
            return or__3824__auto____7632
          }else {
            return G__7630__7631.cljs$core$IReduce$
          }
        }()) {
          return true
        }else {
          if(!G__7630__7631.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.IReduce, G__7630__7631)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.IReduce, G__7630__7631)
      }
    }()) {
      return cljs.core._reduce.call(null, coll, f)
    }else {
      return cljs.core.seq_reduce.call(null, f, coll)
    }
  };
  var reduce__3 = function(f, val, coll) {
    if(function() {
      var G__7633__7634 = coll;
      if(G__7633__7634) {
        if(function() {
          var or__3824__auto____7635 = G__7633__7634.cljs$lang$protocol_mask$partition0$ & 524288;
          if(or__3824__auto____7635) {
            return or__3824__auto____7635
          }else {
            return G__7633__7634.cljs$core$IReduce$
          }
        }()) {
          return true
        }else {
          if(!G__7633__7634.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.IReduce, G__7633__7634)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.IReduce, G__7633__7634)
      }
    }()) {
      return cljs.core._reduce.call(null, coll, f, val)
    }else {
      return cljs.core.seq_reduce.call(null, f, val, coll)
    }
  };
  reduce = function(f, val, coll) {
    switch(arguments.length) {
      case 2:
        return reduce__2.call(this, f, val);
      case 3:
        return reduce__3.call(this, f, val, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  reduce.cljs$lang$arity$2 = reduce__2;
  reduce.cljs$lang$arity$3 = reduce__3;
  return reduce
}();
cljs.core.reduce_kv = function reduce_kv(f, init, coll) {
  return cljs.core._kv_reduce.call(null, coll, f, init)
};
cljs.core.Reduced = function(val) {
  this.val = val;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32768
};
cljs.core.Reduced.cljs$lang$type = true;
cljs.core.Reduced.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/Reduced")
};
cljs.core.Reduced.prototype.cljs$core$IDeref$_deref$arity$1 = function(o) {
  var this__7636 = this;
  return this__7636.val
};
cljs.core.Reduced;
cljs.core.reduced_QMARK_ = function reduced_QMARK_(r) {
  return cljs.core.instance_QMARK_.call(null, cljs.core.Reduced, r)
};
cljs.core.reduced = function reduced(x) {
  return new cljs.core.Reduced(x)
};
cljs.core._PLUS_ = function() {
  var _PLUS_ = null;
  var _PLUS___0 = function() {
    return 0
  };
  var _PLUS___1 = function(x) {
    return x
  };
  var _PLUS___2 = function(x, y) {
    return x + y
  };
  var _PLUS___3 = function() {
    var G__7637__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _PLUS_, x + y, more)
    };
    var G__7637 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7637__delegate.call(this, x, y, more)
    };
    G__7637.cljs$lang$maxFixedArity = 2;
    G__7637.cljs$lang$applyTo = function(arglist__7638) {
      var x = cljs.core.first(arglist__7638);
      var y = cljs.core.first(cljs.core.next(arglist__7638));
      var more = cljs.core.rest(cljs.core.next(arglist__7638));
      return G__7637__delegate(x, y, more)
    };
    G__7637.cljs$lang$arity$variadic = G__7637__delegate;
    return G__7637
  }();
  _PLUS_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return _PLUS___0.call(this);
      case 1:
        return _PLUS___1.call(this, x);
      case 2:
        return _PLUS___2.call(this, x, y);
      default:
        return _PLUS___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _PLUS_.cljs$lang$maxFixedArity = 2;
  _PLUS_.cljs$lang$applyTo = _PLUS___3.cljs$lang$applyTo;
  _PLUS_.cljs$lang$arity$0 = _PLUS___0;
  _PLUS_.cljs$lang$arity$1 = _PLUS___1;
  _PLUS_.cljs$lang$arity$2 = _PLUS___2;
  _PLUS_.cljs$lang$arity$variadic = _PLUS___3.cljs$lang$arity$variadic;
  return _PLUS_
}();
cljs.core._ = function() {
  var _ = null;
  var ___1 = function(x) {
    return-x
  };
  var ___2 = function(x, y) {
    return x - y
  };
  var ___3 = function() {
    var G__7639__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _, x - y, more)
    };
    var G__7639 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7639__delegate.call(this, x, y, more)
    };
    G__7639.cljs$lang$maxFixedArity = 2;
    G__7639.cljs$lang$applyTo = function(arglist__7640) {
      var x = cljs.core.first(arglist__7640);
      var y = cljs.core.first(cljs.core.next(arglist__7640));
      var more = cljs.core.rest(cljs.core.next(arglist__7640));
      return G__7639__delegate(x, y, more)
    };
    G__7639.cljs$lang$arity$variadic = G__7639__delegate;
    return G__7639
  }();
  _ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return ___1.call(this, x);
      case 2:
        return ___2.call(this, x, y);
      default:
        return ___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _.cljs$lang$maxFixedArity = 2;
  _.cljs$lang$applyTo = ___3.cljs$lang$applyTo;
  _.cljs$lang$arity$1 = ___1;
  _.cljs$lang$arity$2 = ___2;
  _.cljs$lang$arity$variadic = ___3.cljs$lang$arity$variadic;
  return _
}();
cljs.core._STAR_ = function() {
  var _STAR_ = null;
  var _STAR___0 = function() {
    return 1
  };
  var _STAR___1 = function(x) {
    return x
  };
  var _STAR___2 = function(x, y) {
    return x * y
  };
  var _STAR___3 = function() {
    var G__7641__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _STAR_, x * y, more)
    };
    var G__7641 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7641__delegate.call(this, x, y, more)
    };
    G__7641.cljs$lang$maxFixedArity = 2;
    G__7641.cljs$lang$applyTo = function(arglist__7642) {
      var x = cljs.core.first(arglist__7642);
      var y = cljs.core.first(cljs.core.next(arglist__7642));
      var more = cljs.core.rest(cljs.core.next(arglist__7642));
      return G__7641__delegate(x, y, more)
    };
    G__7641.cljs$lang$arity$variadic = G__7641__delegate;
    return G__7641
  }();
  _STAR_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return _STAR___0.call(this);
      case 1:
        return _STAR___1.call(this, x);
      case 2:
        return _STAR___2.call(this, x, y);
      default:
        return _STAR___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _STAR_.cljs$lang$maxFixedArity = 2;
  _STAR_.cljs$lang$applyTo = _STAR___3.cljs$lang$applyTo;
  _STAR_.cljs$lang$arity$0 = _STAR___0;
  _STAR_.cljs$lang$arity$1 = _STAR___1;
  _STAR_.cljs$lang$arity$2 = _STAR___2;
  _STAR_.cljs$lang$arity$variadic = _STAR___3.cljs$lang$arity$variadic;
  return _STAR_
}();
cljs.core._SLASH_ = function() {
  var _SLASH_ = null;
  var _SLASH___1 = function(x) {
    return _SLASH_.call(null, 1, x)
  };
  var _SLASH___2 = function(x, y) {
    return x / y
  };
  var _SLASH___3 = function() {
    var G__7643__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _SLASH_, _SLASH_.call(null, x, y), more)
    };
    var G__7643 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7643__delegate.call(this, x, y, more)
    };
    G__7643.cljs$lang$maxFixedArity = 2;
    G__7643.cljs$lang$applyTo = function(arglist__7644) {
      var x = cljs.core.first(arglist__7644);
      var y = cljs.core.first(cljs.core.next(arglist__7644));
      var more = cljs.core.rest(cljs.core.next(arglist__7644));
      return G__7643__delegate(x, y, more)
    };
    G__7643.cljs$lang$arity$variadic = G__7643__delegate;
    return G__7643
  }();
  _SLASH_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _SLASH___1.call(this, x);
      case 2:
        return _SLASH___2.call(this, x, y);
      default:
        return _SLASH___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _SLASH_.cljs$lang$maxFixedArity = 2;
  _SLASH_.cljs$lang$applyTo = _SLASH___3.cljs$lang$applyTo;
  _SLASH_.cljs$lang$arity$1 = _SLASH___1;
  _SLASH_.cljs$lang$arity$2 = _SLASH___2;
  _SLASH_.cljs$lang$arity$variadic = _SLASH___3.cljs$lang$arity$variadic;
  return _SLASH_
}();
cljs.core._LT_ = function() {
  var _LT_ = null;
  var _LT___1 = function(x) {
    return true
  };
  var _LT___2 = function(x, y) {
    return x < y
  };
  var _LT___3 = function() {
    var G__7645__delegate = function(x, y, more) {
      while(true) {
        if(x < y) {
          if(cljs.core.next.call(null, more)) {
            var G__7646 = y;
            var G__7647 = cljs.core.first.call(null, more);
            var G__7648 = cljs.core.next.call(null, more);
            x = G__7646;
            y = G__7647;
            more = G__7648;
            continue
          }else {
            return y < cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__7645 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7645__delegate.call(this, x, y, more)
    };
    G__7645.cljs$lang$maxFixedArity = 2;
    G__7645.cljs$lang$applyTo = function(arglist__7649) {
      var x = cljs.core.first(arglist__7649);
      var y = cljs.core.first(cljs.core.next(arglist__7649));
      var more = cljs.core.rest(cljs.core.next(arglist__7649));
      return G__7645__delegate(x, y, more)
    };
    G__7645.cljs$lang$arity$variadic = G__7645__delegate;
    return G__7645
  }();
  _LT_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _LT___1.call(this, x);
      case 2:
        return _LT___2.call(this, x, y);
      default:
        return _LT___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _LT_.cljs$lang$maxFixedArity = 2;
  _LT_.cljs$lang$applyTo = _LT___3.cljs$lang$applyTo;
  _LT_.cljs$lang$arity$1 = _LT___1;
  _LT_.cljs$lang$arity$2 = _LT___2;
  _LT_.cljs$lang$arity$variadic = _LT___3.cljs$lang$arity$variadic;
  return _LT_
}();
cljs.core._LT__EQ_ = function() {
  var _LT__EQ_ = null;
  var _LT__EQ___1 = function(x) {
    return true
  };
  var _LT__EQ___2 = function(x, y) {
    return x <= y
  };
  var _LT__EQ___3 = function() {
    var G__7650__delegate = function(x, y, more) {
      while(true) {
        if(x <= y) {
          if(cljs.core.next.call(null, more)) {
            var G__7651 = y;
            var G__7652 = cljs.core.first.call(null, more);
            var G__7653 = cljs.core.next.call(null, more);
            x = G__7651;
            y = G__7652;
            more = G__7653;
            continue
          }else {
            return y <= cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__7650 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7650__delegate.call(this, x, y, more)
    };
    G__7650.cljs$lang$maxFixedArity = 2;
    G__7650.cljs$lang$applyTo = function(arglist__7654) {
      var x = cljs.core.first(arglist__7654);
      var y = cljs.core.first(cljs.core.next(arglist__7654));
      var more = cljs.core.rest(cljs.core.next(arglist__7654));
      return G__7650__delegate(x, y, more)
    };
    G__7650.cljs$lang$arity$variadic = G__7650__delegate;
    return G__7650
  }();
  _LT__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _LT__EQ___1.call(this, x);
      case 2:
        return _LT__EQ___2.call(this, x, y);
      default:
        return _LT__EQ___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _LT__EQ_.cljs$lang$maxFixedArity = 2;
  _LT__EQ_.cljs$lang$applyTo = _LT__EQ___3.cljs$lang$applyTo;
  _LT__EQ_.cljs$lang$arity$1 = _LT__EQ___1;
  _LT__EQ_.cljs$lang$arity$2 = _LT__EQ___2;
  _LT__EQ_.cljs$lang$arity$variadic = _LT__EQ___3.cljs$lang$arity$variadic;
  return _LT__EQ_
}();
cljs.core._GT_ = function() {
  var _GT_ = null;
  var _GT___1 = function(x) {
    return true
  };
  var _GT___2 = function(x, y) {
    return x > y
  };
  var _GT___3 = function() {
    var G__7655__delegate = function(x, y, more) {
      while(true) {
        if(x > y) {
          if(cljs.core.next.call(null, more)) {
            var G__7656 = y;
            var G__7657 = cljs.core.first.call(null, more);
            var G__7658 = cljs.core.next.call(null, more);
            x = G__7656;
            y = G__7657;
            more = G__7658;
            continue
          }else {
            return y > cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__7655 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7655__delegate.call(this, x, y, more)
    };
    G__7655.cljs$lang$maxFixedArity = 2;
    G__7655.cljs$lang$applyTo = function(arglist__7659) {
      var x = cljs.core.first(arglist__7659);
      var y = cljs.core.first(cljs.core.next(arglist__7659));
      var more = cljs.core.rest(cljs.core.next(arglist__7659));
      return G__7655__delegate(x, y, more)
    };
    G__7655.cljs$lang$arity$variadic = G__7655__delegate;
    return G__7655
  }();
  _GT_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _GT___1.call(this, x);
      case 2:
        return _GT___2.call(this, x, y);
      default:
        return _GT___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _GT_.cljs$lang$maxFixedArity = 2;
  _GT_.cljs$lang$applyTo = _GT___3.cljs$lang$applyTo;
  _GT_.cljs$lang$arity$1 = _GT___1;
  _GT_.cljs$lang$arity$2 = _GT___2;
  _GT_.cljs$lang$arity$variadic = _GT___3.cljs$lang$arity$variadic;
  return _GT_
}();
cljs.core._GT__EQ_ = function() {
  var _GT__EQ_ = null;
  var _GT__EQ___1 = function(x) {
    return true
  };
  var _GT__EQ___2 = function(x, y) {
    return x >= y
  };
  var _GT__EQ___3 = function() {
    var G__7660__delegate = function(x, y, more) {
      while(true) {
        if(x >= y) {
          if(cljs.core.next.call(null, more)) {
            var G__7661 = y;
            var G__7662 = cljs.core.first.call(null, more);
            var G__7663 = cljs.core.next.call(null, more);
            x = G__7661;
            y = G__7662;
            more = G__7663;
            continue
          }else {
            return y >= cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__7660 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7660__delegate.call(this, x, y, more)
    };
    G__7660.cljs$lang$maxFixedArity = 2;
    G__7660.cljs$lang$applyTo = function(arglist__7664) {
      var x = cljs.core.first(arglist__7664);
      var y = cljs.core.first(cljs.core.next(arglist__7664));
      var more = cljs.core.rest(cljs.core.next(arglist__7664));
      return G__7660__delegate(x, y, more)
    };
    G__7660.cljs$lang$arity$variadic = G__7660__delegate;
    return G__7660
  }();
  _GT__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _GT__EQ___1.call(this, x);
      case 2:
        return _GT__EQ___2.call(this, x, y);
      default:
        return _GT__EQ___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _GT__EQ_.cljs$lang$maxFixedArity = 2;
  _GT__EQ_.cljs$lang$applyTo = _GT__EQ___3.cljs$lang$applyTo;
  _GT__EQ_.cljs$lang$arity$1 = _GT__EQ___1;
  _GT__EQ_.cljs$lang$arity$2 = _GT__EQ___2;
  _GT__EQ_.cljs$lang$arity$variadic = _GT__EQ___3.cljs$lang$arity$variadic;
  return _GT__EQ_
}();
cljs.core.dec = function dec(x) {
  return x - 1
};
cljs.core.max = function() {
  var max = null;
  var max__1 = function(x) {
    return x
  };
  var max__2 = function(x, y) {
    return x > y ? x : y
  };
  var max__3 = function() {
    var G__7665__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, max, x > y ? x : y, more)
    };
    var G__7665 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7665__delegate.call(this, x, y, more)
    };
    G__7665.cljs$lang$maxFixedArity = 2;
    G__7665.cljs$lang$applyTo = function(arglist__7666) {
      var x = cljs.core.first(arglist__7666);
      var y = cljs.core.first(cljs.core.next(arglist__7666));
      var more = cljs.core.rest(cljs.core.next(arglist__7666));
      return G__7665__delegate(x, y, more)
    };
    G__7665.cljs$lang$arity$variadic = G__7665__delegate;
    return G__7665
  }();
  max = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return max__1.call(this, x);
      case 2:
        return max__2.call(this, x, y);
      default:
        return max__3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  max.cljs$lang$maxFixedArity = 2;
  max.cljs$lang$applyTo = max__3.cljs$lang$applyTo;
  max.cljs$lang$arity$1 = max__1;
  max.cljs$lang$arity$2 = max__2;
  max.cljs$lang$arity$variadic = max__3.cljs$lang$arity$variadic;
  return max
}();
cljs.core.min = function() {
  var min = null;
  var min__1 = function(x) {
    return x
  };
  var min__2 = function(x, y) {
    return x < y ? x : y
  };
  var min__3 = function() {
    var G__7667__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, min, x < y ? x : y, more)
    };
    var G__7667 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7667__delegate.call(this, x, y, more)
    };
    G__7667.cljs$lang$maxFixedArity = 2;
    G__7667.cljs$lang$applyTo = function(arglist__7668) {
      var x = cljs.core.first(arglist__7668);
      var y = cljs.core.first(cljs.core.next(arglist__7668));
      var more = cljs.core.rest(cljs.core.next(arglist__7668));
      return G__7667__delegate(x, y, more)
    };
    G__7667.cljs$lang$arity$variadic = G__7667__delegate;
    return G__7667
  }();
  min = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return min__1.call(this, x);
      case 2:
        return min__2.call(this, x, y);
      default:
        return min__3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  min.cljs$lang$maxFixedArity = 2;
  min.cljs$lang$applyTo = min__3.cljs$lang$applyTo;
  min.cljs$lang$arity$1 = min__1;
  min.cljs$lang$arity$2 = min__2;
  min.cljs$lang$arity$variadic = min__3.cljs$lang$arity$variadic;
  return min
}();
cljs.core.fix = function fix(q) {
  if(q >= 0) {
    return Math.floor.call(null, q)
  }else {
    return Math.ceil.call(null, q)
  }
};
cljs.core.int$ = function int$(x) {
  return cljs.core.fix.call(null, x)
};
cljs.core.long$ = function long$(x) {
  return cljs.core.fix.call(null, x)
};
cljs.core.mod = function mod(n, d) {
  return n % d
};
cljs.core.quot = function quot(n, d) {
  var rem__7670 = n % d;
  return cljs.core.fix.call(null, (n - rem__7670) / d)
};
cljs.core.rem = function rem(n, d) {
  var q__7672 = cljs.core.quot.call(null, n, d);
  return n - d * q__7672
};
cljs.core.rand = function() {
  var rand = null;
  var rand__0 = function() {
    return Math.random.call(null)
  };
  var rand__1 = function(n) {
    return n * rand.call(null)
  };
  rand = function(n) {
    switch(arguments.length) {
      case 0:
        return rand__0.call(this);
      case 1:
        return rand__1.call(this, n)
    }
    throw"Invalid arity: " + arguments.length;
  };
  rand.cljs$lang$arity$0 = rand__0;
  rand.cljs$lang$arity$1 = rand__1;
  return rand
}();
cljs.core.rand_int = function rand_int(n) {
  return cljs.core.fix.call(null, cljs.core.rand.call(null, n))
};
cljs.core.bit_xor = function bit_xor(x, y) {
  return x ^ y
};
cljs.core.bit_and = function bit_and(x, y) {
  return x & y
};
cljs.core.bit_or = function bit_or(x, y) {
  return x | y
};
cljs.core.bit_and_not = function bit_and_not(x, y) {
  return x & ~y
};
cljs.core.bit_clear = function bit_clear(x, n) {
  return x & ~(1 << n)
};
cljs.core.bit_flip = function bit_flip(x, n) {
  return x ^ 1 << n
};
cljs.core.bit_not = function bit_not(x) {
  return~x
};
cljs.core.bit_set = function bit_set(x, n) {
  return x | 1 << n
};
cljs.core.bit_test = function bit_test(x, n) {
  return(x & 1 << n) != 0
};
cljs.core.bit_shift_left = function bit_shift_left(x, n) {
  return x << n
};
cljs.core.bit_shift_right = function bit_shift_right(x, n) {
  return x >> n
};
cljs.core.bit_shift_right_zero_fill = function bit_shift_right_zero_fill(x, n) {
  return x >>> n
};
cljs.core.bit_count = function bit_count(v) {
  var v__7675 = v - (v >> 1 & 1431655765);
  var v__7676 = (v__7675 & 858993459) + (v__7675 >> 2 & 858993459);
  return(v__7676 + (v__7676 >> 4) & 252645135) * 16843009 >> 24
};
cljs.core._EQ__EQ_ = function() {
  var _EQ__EQ_ = null;
  var _EQ__EQ___1 = function(x) {
    return true
  };
  var _EQ__EQ___2 = function(x, y) {
    return cljs.core._equiv.call(null, x, y)
  };
  var _EQ__EQ___3 = function() {
    var G__7677__delegate = function(x, y, more) {
      while(true) {
        if(cljs.core.truth_(_EQ__EQ_.call(null, x, y))) {
          if(cljs.core.next.call(null, more)) {
            var G__7678 = y;
            var G__7679 = cljs.core.first.call(null, more);
            var G__7680 = cljs.core.next.call(null, more);
            x = G__7678;
            y = G__7679;
            more = G__7680;
            continue
          }else {
            return _EQ__EQ_.call(null, y, cljs.core.first.call(null, more))
          }
        }else {
          return false
        }
        break
      }
    };
    var G__7677 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7677__delegate.call(this, x, y, more)
    };
    G__7677.cljs$lang$maxFixedArity = 2;
    G__7677.cljs$lang$applyTo = function(arglist__7681) {
      var x = cljs.core.first(arglist__7681);
      var y = cljs.core.first(cljs.core.next(arglist__7681));
      var more = cljs.core.rest(cljs.core.next(arglist__7681));
      return G__7677__delegate(x, y, more)
    };
    G__7677.cljs$lang$arity$variadic = G__7677__delegate;
    return G__7677
  }();
  _EQ__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _EQ__EQ___1.call(this, x);
      case 2:
        return _EQ__EQ___2.call(this, x, y);
      default:
        return _EQ__EQ___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _EQ__EQ_.cljs$lang$maxFixedArity = 2;
  _EQ__EQ_.cljs$lang$applyTo = _EQ__EQ___3.cljs$lang$applyTo;
  _EQ__EQ_.cljs$lang$arity$1 = _EQ__EQ___1;
  _EQ__EQ_.cljs$lang$arity$2 = _EQ__EQ___2;
  _EQ__EQ_.cljs$lang$arity$variadic = _EQ__EQ___3.cljs$lang$arity$variadic;
  return _EQ__EQ_
}();
cljs.core.pos_QMARK_ = function pos_QMARK_(n) {
  return n > 0
};
cljs.core.zero_QMARK_ = function zero_QMARK_(n) {
  return n === 0
};
cljs.core.neg_QMARK_ = function neg_QMARK_(x) {
  return x < 0
};
cljs.core.nthnext = function nthnext(coll, n) {
  var n__7685 = n;
  var xs__7686 = cljs.core.seq.call(null, coll);
  while(true) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____7687 = xs__7686;
      if(and__3822__auto____7687) {
        return n__7685 > 0
      }else {
        return and__3822__auto____7687
      }
    }())) {
      var G__7688 = n__7685 - 1;
      var G__7689 = cljs.core.next.call(null, xs__7686);
      n__7685 = G__7688;
      xs__7686 = G__7689;
      continue
    }else {
      return xs__7686
    }
    break
  }
};
cljs.core.str_STAR_ = function() {
  var str_STAR_ = null;
  var str_STAR___0 = function() {
    return""
  };
  var str_STAR___1 = function(x) {
    if(x == null) {
      return""
    }else {
      if("\ufdd0'else") {
        return x.toString()
      }else {
        return null
      }
    }
  };
  var str_STAR___2 = function() {
    var G__7690__delegate = function(x, ys) {
      return function(sb, more) {
        while(true) {
          if(cljs.core.truth_(more)) {
            var G__7691 = sb.append(str_STAR_.call(null, cljs.core.first.call(null, more)));
            var G__7692 = cljs.core.next.call(null, more);
            sb = G__7691;
            more = G__7692;
            continue
          }else {
            return str_STAR_.call(null, sb)
          }
          break
        }
      }.call(null, new goog.string.StringBuffer(str_STAR_.call(null, x)), ys)
    };
    var G__7690 = function(x, var_args) {
      var ys = null;
      if(goog.isDef(var_args)) {
        ys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__7690__delegate.call(this, x, ys)
    };
    G__7690.cljs$lang$maxFixedArity = 1;
    G__7690.cljs$lang$applyTo = function(arglist__7693) {
      var x = cljs.core.first(arglist__7693);
      var ys = cljs.core.rest(arglist__7693);
      return G__7690__delegate(x, ys)
    };
    G__7690.cljs$lang$arity$variadic = G__7690__delegate;
    return G__7690
  }();
  str_STAR_ = function(x, var_args) {
    var ys = var_args;
    switch(arguments.length) {
      case 0:
        return str_STAR___0.call(this);
      case 1:
        return str_STAR___1.call(this, x);
      default:
        return str_STAR___2.cljs$lang$arity$variadic(x, cljs.core.array_seq(arguments, 1))
    }
    throw"Invalid arity: " + arguments.length;
  };
  str_STAR_.cljs$lang$maxFixedArity = 1;
  str_STAR_.cljs$lang$applyTo = str_STAR___2.cljs$lang$applyTo;
  str_STAR_.cljs$lang$arity$0 = str_STAR___0;
  str_STAR_.cljs$lang$arity$1 = str_STAR___1;
  str_STAR_.cljs$lang$arity$variadic = str_STAR___2.cljs$lang$arity$variadic;
  return str_STAR_
}();
cljs.core.str = function() {
  var str = null;
  var str__0 = function() {
    return""
  };
  var str__1 = function(x) {
    if(cljs.core.symbol_QMARK_.call(null, x)) {
      return x.substring(2, x.length)
    }else {
      if(cljs.core.keyword_QMARK_.call(null, x)) {
        return cljs.core.str_STAR_.call(null, ":", x.substring(2, x.length))
      }else {
        if(x == null) {
          return""
        }else {
          if("\ufdd0'else") {
            return x.toString()
          }else {
            return null
          }
        }
      }
    }
  };
  var str__2 = function() {
    var G__7694__delegate = function(x, ys) {
      return function(sb, more) {
        while(true) {
          if(cljs.core.truth_(more)) {
            var G__7695 = sb.append(str.call(null, cljs.core.first.call(null, more)));
            var G__7696 = cljs.core.next.call(null, more);
            sb = G__7695;
            more = G__7696;
            continue
          }else {
            return cljs.core.str_STAR_.call(null, sb)
          }
          break
        }
      }.call(null, new goog.string.StringBuffer(str.call(null, x)), ys)
    };
    var G__7694 = function(x, var_args) {
      var ys = null;
      if(goog.isDef(var_args)) {
        ys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__7694__delegate.call(this, x, ys)
    };
    G__7694.cljs$lang$maxFixedArity = 1;
    G__7694.cljs$lang$applyTo = function(arglist__7697) {
      var x = cljs.core.first(arglist__7697);
      var ys = cljs.core.rest(arglist__7697);
      return G__7694__delegate(x, ys)
    };
    G__7694.cljs$lang$arity$variadic = G__7694__delegate;
    return G__7694
  }();
  str = function(x, var_args) {
    var ys = var_args;
    switch(arguments.length) {
      case 0:
        return str__0.call(this);
      case 1:
        return str__1.call(this, x);
      default:
        return str__2.cljs$lang$arity$variadic(x, cljs.core.array_seq(arguments, 1))
    }
    throw"Invalid arity: " + arguments.length;
  };
  str.cljs$lang$maxFixedArity = 1;
  str.cljs$lang$applyTo = str__2.cljs$lang$applyTo;
  str.cljs$lang$arity$0 = str__0;
  str.cljs$lang$arity$1 = str__1;
  str.cljs$lang$arity$variadic = str__2.cljs$lang$arity$variadic;
  return str
}();
cljs.core.subs = function() {
  var subs = null;
  var subs__2 = function(s, start) {
    return s.substring(start)
  };
  var subs__3 = function(s, start, end) {
    return s.substring(start, end)
  };
  subs = function(s, start, end) {
    switch(arguments.length) {
      case 2:
        return subs__2.call(this, s, start);
      case 3:
        return subs__3.call(this, s, start, end)
    }
    throw"Invalid arity: " + arguments.length;
  };
  subs.cljs$lang$arity$2 = subs__2;
  subs.cljs$lang$arity$3 = subs__3;
  return subs
}();
cljs.core.format = function() {
  var format__delegate = function(fmt, args) {
    return cljs.core.apply.call(null, goog.string.format, fmt, args)
  };
  var format = function(fmt, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return format__delegate.call(this, fmt, args)
  };
  format.cljs$lang$maxFixedArity = 1;
  format.cljs$lang$applyTo = function(arglist__7698) {
    var fmt = cljs.core.first(arglist__7698);
    var args = cljs.core.rest(arglist__7698);
    return format__delegate(fmt, args)
  };
  format.cljs$lang$arity$variadic = format__delegate;
  return format
}();
cljs.core.symbol = function() {
  var symbol = null;
  var symbol__1 = function(name) {
    if(cljs.core.symbol_QMARK_.call(null, name)) {
      name
    }else {
      if(cljs.core.keyword_QMARK_.call(null, name)) {
        cljs.core.str_STAR_.call(null, "\ufdd1", "'", cljs.core.subs.call(null, name, 2))
      }else {
      }
    }
    return cljs.core.str_STAR_.call(null, "\ufdd1", "'", name)
  };
  var symbol__2 = function(ns, name) {
    return symbol.call(null, cljs.core.str_STAR_.call(null, ns, "/", name))
  };
  symbol = function(ns, name) {
    switch(arguments.length) {
      case 1:
        return symbol__1.call(this, ns);
      case 2:
        return symbol__2.call(this, ns, name)
    }
    throw"Invalid arity: " + arguments.length;
  };
  symbol.cljs$lang$arity$1 = symbol__1;
  symbol.cljs$lang$arity$2 = symbol__2;
  return symbol
}();
cljs.core.keyword = function() {
  var keyword = null;
  var keyword__1 = function(name) {
    if(cljs.core.keyword_QMARK_.call(null, name)) {
      return name
    }else {
      if(cljs.core.symbol_QMARK_.call(null, name)) {
        return cljs.core.str_STAR_.call(null, "\ufdd0", "'", cljs.core.subs.call(null, name, 2))
      }else {
        if("\ufdd0'else") {
          return cljs.core.str_STAR_.call(null, "\ufdd0", "'", name)
        }else {
          return null
        }
      }
    }
  };
  var keyword__2 = function(ns, name) {
    return keyword.call(null, cljs.core.str_STAR_.call(null, ns, "/", name))
  };
  keyword = function(ns, name) {
    switch(arguments.length) {
      case 1:
        return keyword__1.call(this, ns);
      case 2:
        return keyword__2.call(this, ns, name)
    }
    throw"Invalid arity: " + arguments.length;
  };
  keyword.cljs$lang$arity$1 = keyword__1;
  keyword.cljs$lang$arity$2 = keyword__2;
  return keyword
}();
cljs.core.equiv_sequential = function equiv_sequential(x, y) {
  return cljs.core.boolean$.call(null, cljs.core.sequential_QMARK_.call(null, y) ? function() {
    var xs__7701 = cljs.core.seq.call(null, x);
    var ys__7702 = cljs.core.seq.call(null, y);
    while(true) {
      if(xs__7701 == null) {
        return ys__7702 == null
      }else {
        if(ys__7702 == null) {
          return false
        }else {
          if(cljs.core._EQ_.call(null, cljs.core.first.call(null, xs__7701), cljs.core.first.call(null, ys__7702))) {
            var G__7703 = cljs.core.next.call(null, xs__7701);
            var G__7704 = cljs.core.next.call(null, ys__7702);
            xs__7701 = G__7703;
            ys__7702 = G__7704;
            continue
          }else {
            if("\ufdd0'else") {
              return false
            }else {
              return null
            }
          }
        }
      }
      break
    }
  }() : null)
};
cljs.core.hash_combine = function hash_combine(seed, hash) {
  return seed ^ hash + 2654435769 + (seed << 6) + (seed >> 2)
};
cljs.core.hash_coll = function hash_coll(coll) {
  return cljs.core.reduce.call(null, function(p1__7705_SHARP_, p2__7706_SHARP_) {
    return cljs.core.hash_combine.call(null, p1__7705_SHARP_, cljs.core.hash.call(null, p2__7706_SHARP_, false))
  }, cljs.core.hash.call(null, cljs.core.first.call(null, coll), false), cljs.core.next.call(null, coll))
};
cljs.core.hash_imap = function hash_imap(m) {
  var h__7710 = 0;
  var s__7711 = cljs.core.seq.call(null, m);
  while(true) {
    if(s__7711) {
      var e__7712 = cljs.core.first.call(null, s__7711);
      var G__7713 = (h__7710 + (cljs.core.hash.call(null, cljs.core.key.call(null, e__7712)) ^ cljs.core.hash.call(null, cljs.core.val.call(null, e__7712)))) % 4503599627370496;
      var G__7714 = cljs.core.next.call(null, s__7711);
      h__7710 = G__7713;
      s__7711 = G__7714;
      continue
    }else {
      return h__7710
    }
    break
  }
};
cljs.core.hash_iset = function hash_iset(s) {
  var h__7718 = 0;
  var s__7719 = cljs.core.seq.call(null, s);
  while(true) {
    if(s__7719) {
      var e__7720 = cljs.core.first.call(null, s__7719);
      var G__7721 = (h__7718 + cljs.core.hash.call(null, e__7720)) % 4503599627370496;
      var G__7722 = cljs.core.next.call(null, s__7719);
      h__7718 = G__7721;
      s__7719 = G__7722;
      continue
    }else {
      return h__7718
    }
    break
  }
};
cljs.core.extend_object_BANG_ = function extend_object_BANG_(obj, fn_map) {
  var G__7743__7744 = cljs.core.seq.call(null, fn_map);
  if(G__7743__7744) {
    var G__7746__7748 = cljs.core.first.call(null, G__7743__7744);
    var vec__7747__7749 = G__7746__7748;
    var key_name__7750 = cljs.core.nth.call(null, vec__7747__7749, 0, null);
    var f__7751 = cljs.core.nth.call(null, vec__7747__7749, 1, null);
    var G__7743__7752 = G__7743__7744;
    var G__7746__7753 = G__7746__7748;
    var G__7743__7754 = G__7743__7752;
    while(true) {
      var vec__7755__7756 = G__7746__7753;
      var key_name__7757 = cljs.core.nth.call(null, vec__7755__7756, 0, null);
      var f__7758 = cljs.core.nth.call(null, vec__7755__7756, 1, null);
      var G__7743__7759 = G__7743__7754;
      var str_name__7760 = cljs.core.name.call(null, key_name__7757);
      obj[str_name__7760] = f__7758;
      var temp__3974__auto____7761 = cljs.core.next.call(null, G__7743__7759);
      if(temp__3974__auto____7761) {
        var G__7743__7762 = temp__3974__auto____7761;
        var G__7763 = cljs.core.first.call(null, G__7743__7762);
        var G__7764 = G__7743__7762;
        G__7746__7753 = G__7763;
        G__7743__7754 = G__7764;
        continue
      }else {
      }
      break
    }
  }else {
  }
  return obj
};
cljs.core.List = function(meta, first, rest, count, __hash) {
  this.meta = meta;
  this.first = first;
  this.rest = rest;
  this.count = count;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 65413358
};
cljs.core.List.cljs$lang$type = true;
cljs.core.List.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/List")
};
cljs.core.List.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__7765 = this;
  var h__2188__auto____7766 = this__7765.__hash;
  if(!(h__2188__auto____7766 == null)) {
    return h__2188__auto____7766
  }else {
    var h__2188__auto____7767 = cljs.core.hash_coll.call(null, coll);
    this__7765.__hash = h__2188__auto____7767;
    return h__2188__auto____7767
  }
};
cljs.core.List.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var this__7768 = this;
  if(this__7768.count === 1) {
    return null
  }else {
    return this__7768.rest
  }
};
cljs.core.List.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__7769 = this;
  return new cljs.core.List(this__7769.meta, o, coll, this__7769.count + 1, null)
};
cljs.core.List.prototype.toString = function() {
  var this__7770 = this;
  var this__7771 = this;
  return cljs.core.pr_str.call(null, this__7771)
};
cljs.core.List.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__7772 = this;
  return coll
};
cljs.core.List.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__7773 = this;
  return this__7773.count
};
cljs.core.List.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__7774 = this;
  return this__7774.first
};
cljs.core.List.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__7775 = this;
  return coll.cljs$core$ISeq$_rest$arity$1(coll)
};
cljs.core.List.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__7776 = this;
  return this__7776.first
};
cljs.core.List.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__7777 = this;
  if(this__7777.count === 1) {
    return cljs.core.List.EMPTY
  }else {
    return this__7777.rest
  }
};
cljs.core.List.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__7778 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.List.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__7779 = this;
  return new cljs.core.List(meta, this__7779.first, this__7779.rest, this__7779.count, this__7779.__hash)
};
cljs.core.List.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__7780 = this;
  return this__7780.meta
};
cljs.core.List.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__7781 = this;
  return cljs.core.List.EMPTY
};
cljs.core.List;
cljs.core.EmptyList = function(meta) {
  this.meta = meta;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 65413326
};
cljs.core.EmptyList.cljs$lang$type = true;
cljs.core.EmptyList.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/EmptyList")
};
cljs.core.EmptyList.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__7782 = this;
  return 0
};
cljs.core.EmptyList.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var this__7783 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__7784 = this;
  return new cljs.core.List(this__7784.meta, o, null, 1, null)
};
cljs.core.EmptyList.prototype.toString = function() {
  var this__7785 = this;
  var this__7786 = this;
  return cljs.core.pr_str.call(null, this__7786)
};
cljs.core.EmptyList.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__7787 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__7788 = this;
  return 0
};
cljs.core.EmptyList.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__7789 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__7790 = this;
  throw new Error("Can't pop empty list");
};
cljs.core.EmptyList.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__7791 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__7792 = this;
  return cljs.core.List.EMPTY
};
cljs.core.EmptyList.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__7793 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.EmptyList.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__7794 = this;
  return new cljs.core.EmptyList(meta)
};
cljs.core.EmptyList.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__7795 = this;
  return this__7795.meta
};
cljs.core.EmptyList.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__7796 = this;
  return coll
};
cljs.core.EmptyList;
cljs.core.List.EMPTY = new cljs.core.EmptyList(null);
cljs.core.reversible_QMARK_ = function reversible_QMARK_(coll) {
  var G__7800__7801 = coll;
  if(G__7800__7801) {
    if(function() {
      var or__3824__auto____7802 = G__7800__7801.cljs$lang$protocol_mask$partition0$ & 134217728;
      if(or__3824__auto____7802) {
        return or__3824__auto____7802
      }else {
        return G__7800__7801.cljs$core$IReversible$
      }
    }()) {
      return true
    }else {
      if(!G__7800__7801.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IReversible, G__7800__7801)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IReversible, G__7800__7801)
  }
};
cljs.core.rseq = function rseq(coll) {
  return cljs.core._rseq.call(null, coll)
};
cljs.core.reverse = function reverse(coll) {
  if(cljs.core.reversible_QMARK_.call(null, coll)) {
    return cljs.core.rseq.call(null, coll)
  }else {
    return cljs.core.reduce.call(null, cljs.core.conj, cljs.core.List.EMPTY, coll)
  }
};
cljs.core.list = function() {
  var list = null;
  var list__0 = function() {
    return cljs.core.List.EMPTY
  };
  var list__1 = function(x) {
    return cljs.core.conj.call(null, cljs.core.List.EMPTY, x)
  };
  var list__2 = function(x, y) {
    return cljs.core.conj.call(null, list.call(null, y), x)
  };
  var list__3 = function(x, y, z) {
    return cljs.core.conj.call(null, list.call(null, y, z), x)
  };
  var list__4 = function() {
    var G__7803__delegate = function(x, y, z, items) {
      return cljs.core.conj.call(null, cljs.core.conj.call(null, cljs.core.conj.call(null, cljs.core.reduce.call(null, cljs.core.conj, cljs.core.List.EMPTY, cljs.core.reverse.call(null, items)), z), y), x)
    };
    var G__7803 = function(x, y, z, var_args) {
      var items = null;
      if(goog.isDef(var_args)) {
        items = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__7803__delegate.call(this, x, y, z, items)
    };
    G__7803.cljs$lang$maxFixedArity = 3;
    G__7803.cljs$lang$applyTo = function(arglist__7804) {
      var x = cljs.core.first(arglist__7804);
      var y = cljs.core.first(cljs.core.next(arglist__7804));
      var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7804)));
      var items = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7804)));
      return G__7803__delegate(x, y, z, items)
    };
    G__7803.cljs$lang$arity$variadic = G__7803__delegate;
    return G__7803
  }();
  list = function(x, y, z, var_args) {
    var items = var_args;
    switch(arguments.length) {
      case 0:
        return list__0.call(this);
      case 1:
        return list__1.call(this, x);
      case 2:
        return list__2.call(this, x, y);
      case 3:
        return list__3.call(this, x, y, z);
      default:
        return list__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  list.cljs$lang$maxFixedArity = 3;
  list.cljs$lang$applyTo = list__4.cljs$lang$applyTo;
  list.cljs$lang$arity$0 = list__0;
  list.cljs$lang$arity$1 = list__1;
  list.cljs$lang$arity$2 = list__2;
  list.cljs$lang$arity$3 = list__3;
  list.cljs$lang$arity$variadic = list__4.cljs$lang$arity$variadic;
  return list
}();
cljs.core.Cons = function(meta, first, rest, __hash) {
  this.meta = meta;
  this.first = first;
  this.rest = rest;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 65405164
};
cljs.core.Cons.cljs$lang$type = true;
cljs.core.Cons.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/Cons")
};
cljs.core.Cons.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__7805 = this;
  var h__2188__auto____7806 = this__7805.__hash;
  if(!(h__2188__auto____7806 == null)) {
    return h__2188__auto____7806
  }else {
    var h__2188__auto____7807 = cljs.core.hash_coll.call(null, coll);
    this__7805.__hash = h__2188__auto____7807;
    return h__2188__auto____7807
  }
};
cljs.core.Cons.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var this__7808 = this;
  if(this__7808.rest == null) {
    return null
  }else {
    return cljs.core._seq.call(null, this__7808.rest)
  }
};
cljs.core.Cons.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__7809 = this;
  return new cljs.core.Cons(null, o, coll, this__7809.__hash)
};
cljs.core.Cons.prototype.toString = function() {
  var this__7810 = this;
  var this__7811 = this;
  return cljs.core.pr_str.call(null, this__7811)
};
cljs.core.Cons.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__7812 = this;
  return coll
};
cljs.core.Cons.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__7813 = this;
  return this__7813.first
};
cljs.core.Cons.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__7814 = this;
  if(this__7814.rest == null) {
    return cljs.core.List.EMPTY
  }else {
    return this__7814.rest
  }
};
cljs.core.Cons.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__7815 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.Cons.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__7816 = this;
  return new cljs.core.Cons(meta, this__7816.first, this__7816.rest, this__7816.__hash)
};
cljs.core.Cons.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__7817 = this;
  return this__7817.meta
};
cljs.core.Cons.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__7818 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__7818.meta)
};
cljs.core.Cons;
cljs.core.cons = function cons(x, coll) {
  if(function() {
    var or__3824__auto____7823 = coll == null;
    if(or__3824__auto____7823) {
      return or__3824__auto____7823
    }else {
      var G__7824__7825 = coll;
      if(G__7824__7825) {
        if(function() {
          var or__3824__auto____7826 = G__7824__7825.cljs$lang$protocol_mask$partition0$ & 64;
          if(or__3824__auto____7826) {
            return or__3824__auto____7826
          }else {
            return G__7824__7825.cljs$core$ISeq$
          }
        }()) {
          return true
        }else {
          if(!G__7824__7825.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__7824__7825)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__7824__7825)
      }
    }
  }()) {
    return new cljs.core.Cons(null, x, coll, null)
  }else {
    return new cljs.core.Cons(null, x, cljs.core.seq.call(null, coll), null)
  }
};
cljs.core.list_QMARK_ = function list_QMARK_(x) {
  var G__7830__7831 = x;
  if(G__7830__7831) {
    if(function() {
      var or__3824__auto____7832 = G__7830__7831.cljs$lang$protocol_mask$partition0$ & 33554432;
      if(or__3824__auto____7832) {
        return or__3824__auto____7832
      }else {
        return G__7830__7831.cljs$core$IList$
      }
    }()) {
      return true
    }else {
      if(!G__7830__7831.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IList, G__7830__7831)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IList, G__7830__7831)
  }
};
cljs.core.IReduce["string"] = true;
cljs.core._reduce["string"] = function() {
  var G__7833 = null;
  var G__7833__2 = function(string, f) {
    return cljs.core.ci_reduce.call(null, string, f)
  };
  var G__7833__3 = function(string, f, start) {
    return cljs.core.ci_reduce.call(null, string, f, start)
  };
  G__7833 = function(string, f, start) {
    switch(arguments.length) {
      case 2:
        return G__7833__2.call(this, string, f);
      case 3:
        return G__7833__3.call(this, string, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7833
}();
cljs.core.ILookup["string"] = true;
cljs.core._lookup["string"] = function() {
  var G__7834 = null;
  var G__7834__2 = function(string, k) {
    return cljs.core._nth.call(null, string, k)
  };
  var G__7834__3 = function(string, k, not_found) {
    return cljs.core._nth.call(null, string, k, not_found)
  };
  G__7834 = function(string, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__7834__2.call(this, string, k);
      case 3:
        return G__7834__3.call(this, string, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7834
}();
cljs.core.IIndexed["string"] = true;
cljs.core._nth["string"] = function() {
  var G__7835 = null;
  var G__7835__2 = function(string, n) {
    if(n < cljs.core._count.call(null, string)) {
      return string.charAt(n)
    }else {
      return null
    }
  };
  var G__7835__3 = function(string, n, not_found) {
    if(n < cljs.core._count.call(null, string)) {
      return string.charAt(n)
    }else {
      return not_found
    }
  };
  G__7835 = function(string, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__7835__2.call(this, string, n);
      case 3:
        return G__7835__3.call(this, string, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7835
}();
cljs.core.ICounted["string"] = true;
cljs.core._count["string"] = function(s) {
  return s.length
};
cljs.core.ISeqable["string"] = true;
cljs.core._seq["string"] = function(string) {
  return cljs.core.prim_seq.call(null, string, 0)
};
cljs.core.IHash["string"] = true;
cljs.core._hash["string"] = function(o) {
  return goog.string.hashCode(o)
};
cljs.core.Keyword = function(k) {
  this.k = k;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 1
};
cljs.core.Keyword.cljs$lang$type = true;
cljs.core.Keyword.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/Keyword")
};
cljs.core.Keyword.prototype.call = function() {
  var G__7847 = null;
  var G__7847__2 = function(this_sym7838, coll) {
    var this__7840 = this;
    var this_sym7838__7841 = this;
    var ___7842 = this_sym7838__7841;
    if(coll == null) {
      return null
    }else {
      var strobj__7843 = coll.strobj;
      if(strobj__7843 == null) {
        return cljs.core._lookup.call(null, coll, this__7840.k, null)
      }else {
        return strobj__7843[this__7840.k]
      }
    }
  };
  var G__7847__3 = function(this_sym7839, coll, not_found) {
    var this__7840 = this;
    var this_sym7839__7844 = this;
    var ___7845 = this_sym7839__7844;
    if(coll == null) {
      return not_found
    }else {
      return cljs.core._lookup.call(null, coll, this__7840.k, not_found)
    }
  };
  G__7847 = function(this_sym7839, coll, not_found) {
    switch(arguments.length) {
      case 2:
        return G__7847__2.call(this, this_sym7839, coll);
      case 3:
        return G__7847__3.call(this, this_sym7839, coll, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7847
}();
cljs.core.Keyword.prototype.apply = function(this_sym7836, args7837) {
  var this__7846 = this;
  return this_sym7836.call.apply(this_sym7836, [this_sym7836].concat(args7837.slice()))
};
cljs.core.Keyword;
String.prototype.cljs$core$IFn$ = true;
String.prototype.call = function() {
  var G__7856 = null;
  var G__7856__2 = function(this_sym7850, coll) {
    var this_sym7850__7852 = this;
    var this__7853 = this_sym7850__7852;
    return cljs.core._lookup.call(null, coll, this__7853.toString(), null)
  };
  var G__7856__3 = function(this_sym7851, coll, not_found) {
    var this_sym7851__7854 = this;
    var this__7855 = this_sym7851__7854;
    return cljs.core._lookup.call(null, coll, this__7855.toString(), not_found)
  };
  G__7856 = function(this_sym7851, coll, not_found) {
    switch(arguments.length) {
      case 2:
        return G__7856__2.call(this, this_sym7851, coll);
      case 3:
        return G__7856__3.call(this, this_sym7851, coll, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7856
}();
String.prototype.apply = function(this_sym7848, args7849) {
  return this_sym7848.call.apply(this_sym7848, [this_sym7848].concat(args7849.slice()))
};
String.prototype.apply = function(s, args) {
  if(cljs.core.count.call(null, args) < 2) {
    return cljs.core._lookup.call(null, args[0], s, null)
  }else {
    return cljs.core._lookup.call(null, args[0], s, args[1])
  }
};
cljs.core.lazy_seq_value = function lazy_seq_value(lazy_seq) {
  var x__7858 = lazy_seq.x;
  if(lazy_seq.realized) {
    return x__7858
  }else {
    lazy_seq.x = x__7858.call(null);
    lazy_seq.realized = true;
    return lazy_seq.x
  }
};
cljs.core.LazySeq = function(meta, realized, x, __hash) {
  this.meta = meta;
  this.realized = realized;
  this.x = x;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31850700
};
cljs.core.LazySeq.cljs$lang$type = true;
cljs.core.LazySeq.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/LazySeq")
};
cljs.core.LazySeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__7859 = this;
  var h__2188__auto____7860 = this__7859.__hash;
  if(!(h__2188__auto____7860 == null)) {
    return h__2188__auto____7860
  }else {
    var h__2188__auto____7861 = cljs.core.hash_coll.call(null, coll);
    this__7859.__hash = h__2188__auto____7861;
    return h__2188__auto____7861
  }
};
cljs.core.LazySeq.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var this__7862 = this;
  return cljs.core._seq.call(null, coll.cljs$core$ISeq$_rest$arity$1(coll))
};
cljs.core.LazySeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__7863 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.LazySeq.prototype.toString = function() {
  var this__7864 = this;
  var this__7865 = this;
  return cljs.core.pr_str.call(null, this__7865)
};
cljs.core.LazySeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__7866 = this;
  return cljs.core.seq.call(null, cljs.core.lazy_seq_value.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__7867 = this;
  return cljs.core.first.call(null, cljs.core.lazy_seq_value.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__7868 = this;
  return cljs.core.rest.call(null, cljs.core.lazy_seq_value.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__7869 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.LazySeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__7870 = this;
  return new cljs.core.LazySeq(meta, this__7870.realized, this__7870.x, this__7870.__hash)
};
cljs.core.LazySeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__7871 = this;
  return this__7871.meta
};
cljs.core.LazySeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__7872 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__7872.meta)
};
cljs.core.LazySeq;
cljs.core.ChunkBuffer = function(buf, end) {
  this.buf = buf;
  this.end = end;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 2
};
cljs.core.ChunkBuffer.cljs$lang$type = true;
cljs.core.ChunkBuffer.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/ChunkBuffer")
};
cljs.core.ChunkBuffer.prototype.cljs$core$ICounted$_count$arity$1 = function(_) {
  var this__7873 = this;
  return this__7873.end
};
cljs.core.ChunkBuffer.prototype.add = function(o) {
  var this__7874 = this;
  var ___7875 = this;
  this__7874.buf[this__7874.end] = o;
  return this__7874.end = this__7874.end + 1
};
cljs.core.ChunkBuffer.prototype.chunk = function(o) {
  var this__7876 = this;
  var ___7877 = this;
  var ret__7878 = new cljs.core.ArrayChunk(this__7876.buf, 0, this__7876.end);
  this__7876.buf = null;
  return ret__7878
};
cljs.core.ChunkBuffer;
cljs.core.chunk_buffer = function chunk_buffer(capacity) {
  return new cljs.core.ChunkBuffer(cljs.core.make_array.call(null, capacity), 0)
};
cljs.core.ArrayChunk = function(arr, off, end) {
  this.arr = arr;
  this.off = off;
  this.end = end;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 524306
};
cljs.core.ArrayChunk.cljs$lang$type = true;
cljs.core.ArrayChunk.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/ArrayChunk")
};
cljs.core.ArrayChunk.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var this__7879 = this;
  return cljs.core.ci_reduce.call(null, coll, f, this__7879.arr[this__7879.off], this__7879.off + 1)
};
cljs.core.ArrayChunk.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var this__7880 = this;
  return cljs.core.ci_reduce.call(null, coll, f, start, this__7880.off)
};
cljs.core.ArrayChunk.prototype.cljs$core$IChunk$ = true;
cljs.core.ArrayChunk.prototype.cljs$core$IChunk$_drop_first$arity$1 = function(coll) {
  var this__7881 = this;
  if(this__7881.off === this__7881.end) {
    throw new Error("-drop-first of empty chunk");
  }else {
    return new cljs.core.ArrayChunk(this__7881.arr, this__7881.off + 1, this__7881.end)
  }
};
cljs.core.ArrayChunk.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, i) {
  var this__7882 = this;
  return this__7882.arr[this__7882.off + i]
};
cljs.core.ArrayChunk.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, i, not_found) {
  var this__7883 = this;
  if(function() {
    var and__3822__auto____7884 = i >= 0;
    if(and__3822__auto____7884) {
      return i < this__7883.end - this__7883.off
    }else {
      return and__3822__auto____7884
    }
  }()) {
    return this__7883.arr[this__7883.off + i]
  }else {
    return not_found
  }
};
cljs.core.ArrayChunk.prototype.cljs$core$ICounted$_count$arity$1 = function(_) {
  var this__7885 = this;
  return this__7885.end - this__7885.off
};
cljs.core.ArrayChunk;
cljs.core.array_chunk = function() {
  var array_chunk = null;
  var array_chunk__1 = function(arr) {
    return array_chunk.call(null, arr, 0, arr.length)
  };
  var array_chunk__2 = function(arr, off) {
    return array_chunk.call(null, arr, off, arr.length)
  };
  var array_chunk__3 = function(arr, off, end) {
    return new cljs.core.ArrayChunk(arr, off, end)
  };
  array_chunk = function(arr, off, end) {
    switch(arguments.length) {
      case 1:
        return array_chunk__1.call(this, arr);
      case 2:
        return array_chunk__2.call(this, arr, off);
      case 3:
        return array_chunk__3.call(this, arr, off, end)
    }
    throw"Invalid arity: " + arguments.length;
  };
  array_chunk.cljs$lang$arity$1 = array_chunk__1;
  array_chunk.cljs$lang$arity$2 = array_chunk__2;
  array_chunk.cljs$lang$arity$3 = array_chunk__3;
  return array_chunk
}();
cljs.core.ChunkedCons = function(chunk, more, meta) {
  this.chunk = chunk;
  this.more = more;
  this.meta = meta;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 27656296
};
cljs.core.ChunkedCons.cljs$lang$type = true;
cljs.core.ChunkedCons.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/ChunkedCons")
};
cljs.core.ChunkedCons.prototype.cljs$core$ICollection$_conj$arity$2 = function(this$, o) {
  var this__7886 = this;
  return cljs.core.cons.call(null, o, this$)
};
cljs.core.ChunkedCons.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__7887 = this;
  return coll
};
cljs.core.ChunkedCons.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__7888 = this;
  return cljs.core._nth.call(null, this__7888.chunk, 0)
};
cljs.core.ChunkedCons.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__7889 = this;
  if(cljs.core._count.call(null, this__7889.chunk) > 1) {
    return new cljs.core.ChunkedCons(cljs.core._drop_first.call(null, this__7889.chunk), this__7889.more, this__7889.meta)
  }else {
    if(this__7889.more == null) {
      return cljs.core.List.EMPTY
    }else {
      return this__7889.more
    }
  }
};
cljs.core.ChunkedCons.prototype.cljs$core$IChunkedNext$ = true;
cljs.core.ChunkedCons.prototype.cljs$core$IChunkedNext$_chunked_next$arity$1 = function(coll) {
  var this__7890 = this;
  if(this__7890.more == null) {
    return null
  }else {
    return this__7890.more
  }
};
cljs.core.ChunkedCons.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__7891 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.ChunkedCons.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, m) {
  var this__7892 = this;
  return new cljs.core.ChunkedCons(this__7892.chunk, this__7892.more, m)
};
cljs.core.ChunkedCons.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__7893 = this;
  return this__7893.meta
};
cljs.core.ChunkedCons.prototype.cljs$core$IChunkedSeq$ = true;
cljs.core.ChunkedCons.prototype.cljs$core$IChunkedSeq$_chunked_first$arity$1 = function(coll) {
  var this__7894 = this;
  return this__7894.chunk
};
cljs.core.ChunkedCons.prototype.cljs$core$IChunkedSeq$_chunked_rest$arity$1 = function(coll) {
  var this__7895 = this;
  if(this__7895.more == null) {
    return cljs.core.List.EMPTY
  }else {
    return this__7895.more
  }
};
cljs.core.ChunkedCons;
cljs.core.chunk_cons = function chunk_cons(chunk, rest) {
  if(cljs.core._count.call(null, chunk) === 0) {
    return rest
  }else {
    return new cljs.core.ChunkedCons(chunk, rest, null)
  }
};
cljs.core.chunk_append = function chunk_append(b, x) {
  return b.add(x)
};
cljs.core.chunk = function chunk(b) {
  return b.chunk()
};
cljs.core.chunk_first = function chunk_first(s) {
  return cljs.core._chunked_first.call(null, s)
};
cljs.core.chunk_rest = function chunk_rest(s) {
  return cljs.core._chunked_rest.call(null, s)
};
cljs.core.chunk_next = function chunk_next(s) {
  if(function() {
    var G__7899__7900 = s;
    if(G__7899__7900) {
      if(cljs.core.truth_(function() {
        var or__3824__auto____7901 = null;
        if(cljs.core.truth_(or__3824__auto____7901)) {
          return or__3824__auto____7901
        }else {
          return G__7899__7900.cljs$core$IChunkedNext$
        }
      }())) {
        return true
      }else {
        if(!G__7899__7900.cljs$lang$protocol_mask$partition$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.IChunkedNext, G__7899__7900)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IChunkedNext, G__7899__7900)
    }
  }()) {
    return cljs.core._chunked_next.call(null, s)
  }else {
    return cljs.core.seq.call(null, cljs.core._chunked_rest.call(null, s))
  }
};
cljs.core.to_array = function to_array(s) {
  var ary__7904 = [];
  var s__7905 = s;
  while(true) {
    if(cljs.core.seq.call(null, s__7905)) {
      ary__7904.push(cljs.core.first.call(null, s__7905));
      var G__7906 = cljs.core.next.call(null, s__7905);
      s__7905 = G__7906;
      continue
    }else {
      return ary__7904
    }
    break
  }
};
cljs.core.to_array_2d = function to_array_2d(coll) {
  var ret__7910 = cljs.core.make_array.call(null, cljs.core.count.call(null, coll));
  var i__7911 = 0;
  var xs__7912 = cljs.core.seq.call(null, coll);
  while(true) {
    if(xs__7912) {
      ret__7910[i__7911] = cljs.core.to_array.call(null, cljs.core.first.call(null, xs__7912));
      var G__7913 = i__7911 + 1;
      var G__7914 = cljs.core.next.call(null, xs__7912);
      i__7911 = G__7913;
      xs__7912 = G__7914;
      continue
    }else {
    }
    break
  }
  return ret__7910
};
cljs.core.long_array = function() {
  var long_array = null;
  var long_array__1 = function(size_or_seq) {
    if(cljs.core.number_QMARK_.call(null, size_or_seq)) {
      return long_array.call(null, size_or_seq, null)
    }else {
      if(cljs.core.seq_QMARK_.call(null, size_or_seq)) {
        return cljs.core.into_array.call(null, size_or_seq)
      }else {
        if("\ufdd0'else") {
          throw new Error("long-array called with something other than size or ISeq");
        }else {
          return null
        }
      }
    }
  };
  var long_array__2 = function(size, init_val_or_seq) {
    var a__7922 = cljs.core.make_array.call(null, size);
    if(cljs.core.seq_QMARK_.call(null, init_val_or_seq)) {
      var s__7923 = cljs.core.seq.call(null, init_val_or_seq);
      var i__7924 = 0;
      var s__7925 = s__7923;
      while(true) {
        if(cljs.core.truth_(function() {
          var and__3822__auto____7926 = s__7925;
          if(and__3822__auto____7926) {
            return i__7924 < size
          }else {
            return and__3822__auto____7926
          }
        }())) {
          a__7922[i__7924] = cljs.core.first.call(null, s__7925);
          var G__7929 = i__7924 + 1;
          var G__7930 = cljs.core.next.call(null, s__7925);
          i__7924 = G__7929;
          s__7925 = G__7930;
          continue
        }else {
          return a__7922
        }
        break
      }
    }else {
      var n__2523__auto____7927 = size;
      var i__7928 = 0;
      while(true) {
        if(i__7928 < n__2523__auto____7927) {
          a__7922[i__7928] = init_val_or_seq;
          var G__7931 = i__7928 + 1;
          i__7928 = G__7931;
          continue
        }else {
        }
        break
      }
      return a__7922
    }
  };
  long_array = function(size, init_val_or_seq) {
    switch(arguments.length) {
      case 1:
        return long_array__1.call(this, size);
      case 2:
        return long_array__2.call(this, size, init_val_or_seq)
    }
    throw"Invalid arity: " + arguments.length;
  };
  long_array.cljs$lang$arity$1 = long_array__1;
  long_array.cljs$lang$arity$2 = long_array__2;
  return long_array
}();
cljs.core.double_array = function() {
  var double_array = null;
  var double_array__1 = function(size_or_seq) {
    if(cljs.core.number_QMARK_.call(null, size_or_seq)) {
      return double_array.call(null, size_or_seq, null)
    }else {
      if(cljs.core.seq_QMARK_.call(null, size_or_seq)) {
        return cljs.core.into_array.call(null, size_or_seq)
      }else {
        if("\ufdd0'else") {
          throw new Error("double-array called with something other than size or ISeq");
        }else {
          return null
        }
      }
    }
  };
  var double_array__2 = function(size, init_val_or_seq) {
    var a__7939 = cljs.core.make_array.call(null, size);
    if(cljs.core.seq_QMARK_.call(null, init_val_or_seq)) {
      var s__7940 = cljs.core.seq.call(null, init_val_or_seq);
      var i__7941 = 0;
      var s__7942 = s__7940;
      while(true) {
        if(cljs.core.truth_(function() {
          var and__3822__auto____7943 = s__7942;
          if(and__3822__auto____7943) {
            return i__7941 < size
          }else {
            return and__3822__auto____7943
          }
        }())) {
          a__7939[i__7941] = cljs.core.first.call(null, s__7942);
          var G__7946 = i__7941 + 1;
          var G__7947 = cljs.core.next.call(null, s__7942);
          i__7941 = G__7946;
          s__7942 = G__7947;
          continue
        }else {
          return a__7939
        }
        break
      }
    }else {
      var n__2523__auto____7944 = size;
      var i__7945 = 0;
      while(true) {
        if(i__7945 < n__2523__auto____7944) {
          a__7939[i__7945] = init_val_or_seq;
          var G__7948 = i__7945 + 1;
          i__7945 = G__7948;
          continue
        }else {
        }
        break
      }
      return a__7939
    }
  };
  double_array = function(size, init_val_or_seq) {
    switch(arguments.length) {
      case 1:
        return double_array__1.call(this, size);
      case 2:
        return double_array__2.call(this, size, init_val_or_seq)
    }
    throw"Invalid arity: " + arguments.length;
  };
  double_array.cljs$lang$arity$1 = double_array__1;
  double_array.cljs$lang$arity$2 = double_array__2;
  return double_array
}();
cljs.core.object_array = function() {
  var object_array = null;
  var object_array__1 = function(size_or_seq) {
    if(cljs.core.number_QMARK_.call(null, size_or_seq)) {
      return object_array.call(null, size_or_seq, null)
    }else {
      if(cljs.core.seq_QMARK_.call(null, size_or_seq)) {
        return cljs.core.into_array.call(null, size_or_seq)
      }else {
        if("\ufdd0'else") {
          throw new Error("object-array called with something other than size or ISeq");
        }else {
          return null
        }
      }
    }
  };
  var object_array__2 = function(size, init_val_or_seq) {
    var a__7956 = cljs.core.make_array.call(null, size);
    if(cljs.core.seq_QMARK_.call(null, init_val_or_seq)) {
      var s__7957 = cljs.core.seq.call(null, init_val_or_seq);
      var i__7958 = 0;
      var s__7959 = s__7957;
      while(true) {
        if(cljs.core.truth_(function() {
          var and__3822__auto____7960 = s__7959;
          if(and__3822__auto____7960) {
            return i__7958 < size
          }else {
            return and__3822__auto____7960
          }
        }())) {
          a__7956[i__7958] = cljs.core.first.call(null, s__7959);
          var G__7963 = i__7958 + 1;
          var G__7964 = cljs.core.next.call(null, s__7959);
          i__7958 = G__7963;
          s__7959 = G__7964;
          continue
        }else {
          return a__7956
        }
        break
      }
    }else {
      var n__2523__auto____7961 = size;
      var i__7962 = 0;
      while(true) {
        if(i__7962 < n__2523__auto____7961) {
          a__7956[i__7962] = init_val_or_seq;
          var G__7965 = i__7962 + 1;
          i__7962 = G__7965;
          continue
        }else {
        }
        break
      }
      return a__7956
    }
  };
  object_array = function(size, init_val_or_seq) {
    switch(arguments.length) {
      case 1:
        return object_array__1.call(this, size);
      case 2:
        return object_array__2.call(this, size, init_val_or_seq)
    }
    throw"Invalid arity: " + arguments.length;
  };
  object_array.cljs$lang$arity$1 = object_array__1;
  object_array.cljs$lang$arity$2 = object_array__2;
  return object_array
}();
cljs.core.bounded_count = function bounded_count(s, n) {
  if(cljs.core.counted_QMARK_.call(null, s)) {
    return cljs.core.count.call(null, s)
  }else {
    var s__7970 = s;
    var i__7971 = n;
    var sum__7972 = 0;
    while(true) {
      if(cljs.core.truth_(function() {
        var and__3822__auto____7973 = i__7971 > 0;
        if(and__3822__auto____7973) {
          return cljs.core.seq.call(null, s__7970)
        }else {
          return and__3822__auto____7973
        }
      }())) {
        var G__7974 = cljs.core.next.call(null, s__7970);
        var G__7975 = i__7971 - 1;
        var G__7976 = sum__7972 + 1;
        s__7970 = G__7974;
        i__7971 = G__7975;
        sum__7972 = G__7976;
        continue
      }else {
        return sum__7972
      }
      break
    }
  }
};
cljs.core.spread = function spread(arglist) {
  if(arglist == null) {
    return null
  }else {
    if(cljs.core.next.call(null, arglist) == null) {
      return cljs.core.seq.call(null, cljs.core.first.call(null, arglist))
    }else {
      if("\ufdd0'else") {
        return cljs.core.cons.call(null, cljs.core.first.call(null, arglist), spread.call(null, cljs.core.next.call(null, arglist)))
      }else {
        return null
      }
    }
  }
};
cljs.core.concat = function() {
  var concat = null;
  var concat__0 = function() {
    return new cljs.core.LazySeq(null, false, function() {
      return null
    }, null)
  };
  var concat__1 = function(x) {
    return new cljs.core.LazySeq(null, false, function() {
      return x
    }, null)
  };
  var concat__2 = function(x, y) {
    return new cljs.core.LazySeq(null, false, function() {
      var s__7981 = cljs.core.seq.call(null, x);
      if(s__7981) {
        if(cljs.core.chunked_seq_QMARK_.call(null, s__7981)) {
          return cljs.core.chunk_cons.call(null, cljs.core.chunk_first.call(null, s__7981), concat.call(null, cljs.core.chunk_rest.call(null, s__7981), y))
        }else {
          return cljs.core.cons.call(null, cljs.core.first.call(null, s__7981), concat.call(null, cljs.core.rest.call(null, s__7981), y))
        }
      }else {
        return y
      }
    }, null)
  };
  var concat__3 = function() {
    var G__7985__delegate = function(x, y, zs) {
      var cat__7984 = function cat(xys, zs) {
        return new cljs.core.LazySeq(null, false, function() {
          var xys__7983 = cljs.core.seq.call(null, xys);
          if(xys__7983) {
            if(cljs.core.chunked_seq_QMARK_.call(null, xys__7983)) {
              return cljs.core.chunk_cons.call(null, cljs.core.chunk_first.call(null, xys__7983), cat.call(null, cljs.core.chunk_rest.call(null, xys__7983), zs))
            }else {
              return cljs.core.cons.call(null, cljs.core.first.call(null, xys__7983), cat.call(null, cljs.core.rest.call(null, xys__7983), zs))
            }
          }else {
            if(cljs.core.truth_(zs)) {
              return cat.call(null, cljs.core.first.call(null, zs), cljs.core.next.call(null, zs))
            }else {
              return null
            }
          }
        }, null)
      };
      return cat__7984.call(null, concat.call(null, x, y), zs)
    };
    var G__7985 = function(x, y, var_args) {
      var zs = null;
      if(goog.isDef(var_args)) {
        zs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7985__delegate.call(this, x, y, zs)
    };
    G__7985.cljs$lang$maxFixedArity = 2;
    G__7985.cljs$lang$applyTo = function(arglist__7986) {
      var x = cljs.core.first(arglist__7986);
      var y = cljs.core.first(cljs.core.next(arglist__7986));
      var zs = cljs.core.rest(cljs.core.next(arglist__7986));
      return G__7985__delegate(x, y, zs)
    };
    G__7985.cljs$lang$arity$variadic = G__7985__delegate;
    return G__7985
  }();
  concat = function(x, y, var_args) {
    var zs = var_args;
    switch(arguments.length) {
      case 0:
        return concat__0.call(this);
      case 1:
        return concat__1.call(this, x);
      case 2:
        return concat__2.call(this, x, y);
      default:
        return concat__3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  concat.cljs$lang$maxFixedArity = 2;
  concat.cljs$lang$applyTo = concat__3.cljs$lang$applyTo;
  concat.cljs$lang$arity$0 = concat__0;
  concat.cljs$lang$arity$1 = concat__1;
  concat.cljs$lang$arity$2 = concat__2;
  concat.cljs$lang$arity$variadic = concat__3.cljs$lang$arity$variadic;
  return concat
}();
cljs.core.list_STAR_ = function() {
  var list_STAR_ = null;
  var list_STAR___1 = function(args) {
    return cljs.core.seq.call(null, args)
  };
  var list_STAR___2 = function(a, args) {
    return cljs.core.cons.call(null, a, args)
  };
  var list_STAR___3 = function(a, b, args) {
    return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, args))
  };
  var list_STAR___4 = function(a, b, c, args) {
    return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, args)))
  };
  var list_STAR___5 = function() {
    var G__7987__delegate = function(a, b, c, d, more) {
      return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, cljs.core.cons.call(null, d, cljs.core.spread.call(null, more)))))
    };
    var G__7987 = function(a, b, c, d, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__7987__delegate.call(this, a, b, c, d, more)
    };
    G__7987.cljs$lang$maxFixedArity = 4;
    G__7987.cljs$lang$applyTo = function(arglist__7988) {
      var a = cljs.core.first(arglist__7988);
      var b = cljs.core.first(cljs.core.next(arglist__7988));
      var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7988)));
      var d = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__7988))));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__7988))));
      return G__7987__delegate(a, b, c, d, more)
    };
    G__7987.cljs$lang$arity$variadic = G__7987__delegate;
    return G__7987
  }();
  list_STAR_ = function(a, b, c, d, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return list_STAR___1.call(this, a);
      case 2:
        return list_STAR___2.call(this, a, b);
      case 3:
        return list_STAR___3.call(this, a, b, c);
      case 4:
        return list_STAR___4.call(this, a, b, c, d);
      default:
        return list_STAR___5.cljs$lang$arity$variadic(a, b, c, d, cljs.core.array_seq(arguments, 4))
    }
    throw"Invalid arity: " + arguments.length;
  };
  list_STAR_.cljs$lang$maxFixedArity = 4;
  list_STAR_.cljs$lang$applyTo = list_STAR___5.cljs$lang$applyTo;
  list_STAR_.cljs$lang$arity$1 = list_STAR___1;
  list_STAR_.cljs$lang$arity$2 = list_STAR___2;
  list_STAR_.cljs$lang$arity$3 = list_STAR___3;
  list_STAR_.cljs$lang$arity$4 = list_STAR___4;
  list_STAR_.cljs$lang$arity$variadic = list_STAR___5.cljs$lang$arity$variadic;
  return list_STAR_
}();
cljs.core.transient$ = function transient$(coll) {
  return cljs.core._as_transient.call(null, coll)
};
cljs.core.persistent_BANG_ = function persistent_BANG_(tcoll) {
  return cljs.core._persistent_BANG_.call(null, tcoll)
};
cljs.core.conj_BANG_ = function conj_BANG_(tcoll, val) {
  return cljs.core._conj_BANG_.call(null, tcoll, val)
};
cljs.core.assoc_BANG_ = function assoc_BANG_(tcoll, key, val) {
  return cljs.core._assoc_BANG_.call(null, tcoll, key, val)
};
cljs.core.dissoc_BANG_ = function dissoc_BANG_(tcoll, key) {
  return cljs.core._dissoc_BANG_.call(null, tcoll, key)
};
cljs.core.pop_BANG_ = function pop_BANG_(tcoll) {
  return cljs.core._pop_BANG_.call(null, tcoll)
};
cljs.core.disj_BANG_ = function disj_BANG_(tcoll, val) {
  return cljs.core._disjoin_BANG_.call(null, tcoll, val)
};
cljs.core.apply_to = function apply_to(f, argc, args) {
  var args__8030 = cljs.core.seq.call(null, args);
  if(argc === 0) {
    return f.call(null)
  }else {
    var a__8031 = cljs.core._first.call(null, args__8030);
    var args__8032 = cljs.core._rest.call(null, args__8030);
    if(argc === 1) {
      if(f.cljs$lang$arity$1) {
        return f.cljs$lang$arity$1(a__8031)
      }else {
        return f.call(null, a__8031)
      }
    }else {
      var b__8033 = cljs.core._first.call(null, args__8032);
      var args__8034 = cljs.core._rest.call(null, args__8032);
      if(argc === 2) {
        if(f.cljs$lang$arity$2) {
          return f.cljs$lang$arity$2(a__8031, b__8033)
        }else {
          return f.call(null, a__8031, b__8033)
        }
      }else {
        var c__8035 = cljs.core._first.call(null, args__8034);
        var args__8036 = cljs.core._rest.call(null, args__8034);
        if(argc === 3) {
          if(f.cljs$lang$arity$3) {
            return f.cljs$lang$arity$3(a__8031, b__8033, c__8035)
          }else {
            return f.call(null, a__8031, b__8033, c__8035)
          }
        }else {
          var d__8037 = cljs.core._first.call(null, args__8036);
          var args__8038 = cljs.core._rest.call(null, args__8036);
          if(argc === 4) {
            if(f.cljs$lang$arity$4) {
              return f.cljs$lang$arity$4(a__8031, b__8033, c__8035, d__8037)
            }else {
              return f.call(null, a__8031, b__8033, c__8035, d__8037)
            }
          }else {
            var e__8039 = cljs.core._first.call(null, args__8038);
            var args__8040 = cljs.core._rest.call(null, args__8038);
            if(argc === 5) {
              if(f.cljs$lang$arity$5) {
                return f.cljs$lang$arity$5(a__8031, b__8033, c__8035, d__8037, e__8039)
              }else {
                return f.call(null, a__8031, b__8033, c__8035, d__8037, e__8039)
              }
            }else {
              var f__8041 = cljs.core._first.call(null, args__8040);
              var args__8042 = cljs.core._rest.call(null, args__8040);
              if(argc === 6) {
                if(f__8041.cljs$lang$arity$6) {
                  return f__8041.cljs$lang$arity$6(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041)
                }else {
                  return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041)
                }
              }else {
                var g__8043 = cljs.core._first.call(null, args__8042);
                var args__8044 = cljs.core._rest.call(null, args__8042);
                if(argc === 7) {
                  if(f__8041.cljs$lang$arity$7) {
                    return f__8041.cljs$lang$arity$7(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043)
                  }else {
                    return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043)
                  }
                }else {
                  var h__8045 = cljs.core._first.call(null, args__8044);
                  var args__8046 = cljs.core._rest.call(null, args__8044);
                  if(argc === 8) {
                    if(f__8041.cljs$lang$arity$8) {
                      return f__8041.cljs$lang$arity$8(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045)
                    }else {
                      return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045)
                    }
                  }else {
                    var i__8047 = cljs.core._first.call(null, args__8046);
                    var args__8048 = cljs.core._rest.call(null, args__8046);
                    if(argc === 9) {
                      if(f__8041.cljs$lang$arity$9) {
                        return f__8041.cljs$lang$arity$9(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047)
                      }else {
                        return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047)
                      }
                    }else {
                      var j__8049 = cljs.core._first.call(null, args__8048);
                      var args__8050 = cljs.core._rest.call(null, args__8048);
                      if(argc === 10) {
                        if(f__8041.cljs$lang$arity$10) {
                          return f__8041.cljs$lang$arity$10(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049)
                        }else {
                          return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049)
                        }
                      }else {
                        var k__8051 = cljs.core._first.call(null, args__8050);
                        var args__8052 = cljs.core._rest.call(null, args__8050);
                        if(argc === 11) {
                          if(f__8041.cljs$lang$arity$11) {
                            return f__8041.cljs$lang$arity$11(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051)
                          }else {
                            return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051)
                          }
                        }else {
                          var l__8053 = cljs.core._first.call(null, args__8052);
                          var args__8054 = cljs.core._rest.call(null, args__8052);
                          if(argc === 12) {
                            if(f__8041.cljs$lang$arity$12) {
                              return f__8041.cljs$lang$arity$12(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053)
                            }else {
                              return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053)
                            }
                          }else {
                            var m__8055 = cljs.core._first.call(null, args__8054);
                            var args__8056 = cljs.core._rest.call(null, args__8054);
                            if(argc === 13) {
                              if(f__8041.cljs$lang$arity$13) {
                                return f__8041.cljs$lang$arity$13(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055)
                              }else {
                                return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055)
                              }
                            }else {
                              var n__8057 = cljs.core._first.call(null, args__8056);
                              var args__8058 = cljs.core._rest.call(null, args__8056);
                              if(argc === 14) {
                                if(f__8041.cljs$lang$arity$14) {
                                  return f__8041.cljs$lang$arity$14(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057)
                                }else {
                                  return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057)
                                }
                              }else {
                                var o__8059 = cljs.core._first.call(null, args__8058);
                                var args__8060 = cljs.core._rest.call(null, args__8058);
                                if(argc === 15) {
                                  if(f__8041.cljs$lang$arity$15) {
                                    return f__8041.cljs$lang$arity$15(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057, o__8059)
                                  }else {
                                    return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057, o__8059)
                                  }
                                }else {
                                  var p__8061 = cljs.core._first.call(null, args__8060);
                                  var args__8062 = cljs.core._rest.call(null, args__8060);
                                  if(argc === 16) {
                                    if(f__8041.cljs$lang$arity$16) {
                                      return f__8041.cljs$lang$arity$16(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057, o__8059, p__8061)
                                    }else {
                                      return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057, o__8059, p__8061)
                                    }
                                  }else {
                                    var q__8063 = cljs.core._first.call(null, args__8062);
                                    var args__8064 = cljs.core._rest.call(null, args__8062);
                                    if(argc === 17) {
                                      if(f__8041.cljs$lang$arity$17) {
                                        return f__8041.cljs$lang$arity$17(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057, o__8059, p__8061, q__8063)
                                      }else {
                                        return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057, o__8059, p__8061, q__8063)
                                      }
                                    }else {
                                      var r__8065 = cljs.core._first.call(null, args__8064);
                                      var args__8066 = cljs.core._rest.call(null, args__8064);
                                      if(argc === 18) {
                                        if(f__8041.cljs$lang$arity$18) {
                                          return f__8041.cljs$lang$arity$18(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057, o__8059, p__8061, q__8063, r__8065)
                                        }else {
                                          return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057, o__8059, p__8061, q__8063, r__8065)
                                        }
                                      }else {
                                        var s__8067 = cljs.core._first.call(null, args__8066);
                                        var args__8068 = cljs.core._rest.call(null, args__8066);
                                        if(argc === 19) {
                                          if(f__8041.cljs$lang$arity$19) {
                                            return f__8041.cljs$lang$arity$19(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057, o__8059, p__8061, q__8063, r__8065, s__8067)
                                          }else {
                                            return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057, o__8059, p__8061, q__8063, r__8065, s__8067)
                                          }
                                        }else {
                                          var t__8069 = cljs.core._first.call(null, args__8068);
                                          var args__8070 = cljs.core._rest.call(null, args__8068);
                                          if(argc === 20) {
                                            if(f__8041.cljs$lang$arity$20) {
                                              return f__8041.cljs$lang$arity$20(a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057, o__8059, p__8061, q__8063, r__8065, s__8067, t__8069)
                                            }else {
                                              return f__8041.call(null, a__8031, b__8033, c__8035, d__8037, e__8039, f__8041, g__8043, h__8045, i__8047, j__8049, k__8051, l__8053, m__8055, n__8057, o__8059, p__8061, q__8063, r__8065, s__8067, t__8069)
                                            }
                                          }else {
                                            throw new Error("Only up to 20 arguments supported on functions");
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
cljs.core.apply = function() {
  var apply = null;
  var apply__2 = function(f, args) {
    var fixed_arity__8085 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      var bc__8086 = cljs.core.bounded_count.call(null, args, fixed_arity__8085 + 1);
      if(bc__8086 <= fixed_arity__8085) {
        return cljs.core.apply_to.call(null, f, bc__8086, args)
      }else {
        return f.cljs$lang$applyTo(args)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, args))
    }
  };
  var apply__3 = function(f, x, args) {
    var arglist__8087 = cljs.core.list_STAR_.call(null, x, args);
    var fixed_arity__8088 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      var bc__8089 = cljs.core.bounded_count.call(null, arglist__8087, fixed_arity__8088 + 1);
      if(bc__8089 <= fixed_arity__8088) {
        return cljs.core.apply_to.call(null, f, bc__8089, arglist__8087)
      }else {
        return f.cljs$lang$applyTo(arglist__8087)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, arglist__8087))
    }
  };
  var apply__4 = function(f, x, y, args) {
    var arglist__8090 = cljs.core.list_STAR_.call(null, x, y, args);
    var fixed_arity__8091 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      var bc__8092 = cljs.core.bounded_count.call(null, arglist__8090, fixed_arity__8091 + 1);
      if(bc__8092 <= fixed_arity__8091) {
        return cljs.core.apply_to.call(null, f, bc__8092, arglist__8090)
      }else {
        return f.cljs$lang$applyTo(arglist__8090)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, arglist__8090))
    }
  };
  var apply__5 = function(f, x, y, z, args) {
    var arglist__8093 = cljs.core.list_STAR_.call(null, x, y, z, args);
    var fixed_arity__8094 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      var bc__8095 = cljs.core.bounded_count.call(null, arglist__8093, fixed_arity__8094 + 1);
      if(bc__8095 <= fixed_arity__8094) {
        return cljs.core.apply_to.call(null, f, bc__8095, arglist__8093)
      }else {
        return f.cljs$lang$applyTo(arglist__8093)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, arglist__8093))
    }
  };
  var apply__6 = function() {
    var G__8099__delegate = function(f, a, b, c, d, args) {
      var arglist__8096 = cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, cljs.core.cons.call(null, d, cljs.core.spread.call(null, args)))));
      var fixed_arity__8097 = f.cljs$lang$maxFixedArity;
      if(cljs.core.truth_(f.cljs$lang$applyTo)) {
        var bc__8098 = cljs.core.bounded_count.call(null, arglist__8096, fixed_arity__8097 + 1);
        if(bc__8098 <= fixed_arity__8097) {
          return cljs.core.apply_to.call(null, f, bc__8098, arglist__8096)
        }else {
          return f.cljs$lang$applyTo(arglist__8096)
        }
      }else {
        return f.apply(f, cljs.core.to_array.call(null, arglist__8096))
      }
    };
    var G__8099 = function(f, a, b, c, d, var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 5), 0)
      }
      return G__8099__delegate.call(this, f, a, b, c, d, args)
    };
    G__8099.cljs$lang$maxFixedArity = 5;
    G__8099.cljs$lang$applyTo = function(arglist__8100) {
      var f = cljs.core.first(arglist__8100);
      var a = cljs.core.first(cljs.core.next(arglist__8100));
      var b = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8100)));
      var c = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__8100))));
      var d = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__8100)))));
      var args = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__8100)))));
      return G__8099__delegate(f, a, b, c, d, args)
    };
    G__8099.cljs$lang$arity$variadic = G__8099__delegate;
    return G__8099
  }();
  apply = function(f, a, b, c, d, var_args) {
    var args = var_args;
    switch(arguments.length) {
      case 2:
        return apply__2.call(this, f, a);
      case 3:
        return apply__3.call(this, f, a, b);
      case 4:
        return apply__4.call(this, f, a, b, c);
      case 5:
        return apply__5.call(this, f, a, b, c, d);
      default:
        return apply__6.cljs$lang$arity$variadic(f, a, b, c, d, cljs.core.array_seq(arguments, 5))
    }
    throw"Invalid arity: " + arguments.length;
  };
  apply.cljs$lang$maxFixedArity = 5;
  apply.cljs$lang$applyTo = apply__6.cljs$lang$applyTo;
  apply.cljs$lang$arity$2 = apply__2;
  apply.cljs$lang$arity$3 = apply__3;
  apply.cljs$lang$arity$4 = apply__4;
  apply.cljs$lang$arity$5 = apply__5;
  apply.cljs$lang$arity$variadic = apply__6.cljs$lang$arity$variadic;
  return apply
}();
cljs.core.vary_meta = function() {
  var vary_meta__delegate = function(obj, f, args) {
    return cljs.core.with_meta.call(null, obj, cljs.core.apply.call(null, f, cljs.core.meta.call(null, obj), args))
  };
  var vary_meta = function(obj, f, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return vary_meta__delegate.call(this, obj, f, args)
  };
  vary_meta.cljs$lang$maxFixedArity = 2;
  vary_meta.cljs$lang$applyTo = function(arglist__8101) {
    var obj = cljs.core.first(arglist__8101);
    var f = cljs.core.first(cljs.core.next(arglist__8101));
    var args = cljs.core.rest(cljs.core.next(arglist__8101));
    return vary_meta__delegate(obj, f, args)
  };
  vary_meta.cljs$lang$arity$variadic = vary_meta__delegate;
  return vary_meta
}();
cljs.core.not_EQ_ = function() {
  var not_EQ_ = null;
  var not_EQ___1 = function(x) {
    return false
  };
  var not_EQ___2 = function(x, y) {
    return!cljs.core._EQ_.call(null, x, y)
  };
  var not_EQ___3 = function() {
    var G__8102__delegate = function(x, y, more) {
      return cljs.core.not.call(null, cljs.core.apply.call(null, cljs.core._EQ_, x, y, more))
    };
    var G__8102 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__8102__delegate.call(this, x, y, more)
    };
    G__8102.cljs$lang$maxFixedArity = 2;
    G__8102.cljs$lang$applyTo = function(arglist__8103) {
      var x = cljs.core.first(arglist__8103);
      var y = cljs.core.first(cljs.core.next(arglist__8103));
      var more = cljs.core.rest(cljs.core.next(arglist__8103));
      return G__8102__delegate(x, y, more)
    };
    G__8102.cljs$lang$arity$variadic = G__8102__delegate;
    return G__8102
  }();
  not_EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return not_EQ___1.call(this, x);
      case 2:
        return not_EQ___2.call(this, x, y);
      default:
        return not_EQ___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  not_EQ_.cljs$lang$maxFixedArity = 2;
  not_EQ_.cljs$lang$applyTo = not_EQ___3.cljs$lang$applyTo;
  not_EQ_.cljs$lang$arity$1 = not_EQ___1;
  not_EQ_.cljs$lang$arity$2 = not_EQ___2;
  not_EQ_.cljs$lang$arity$variadic = not_EQ___3.cljs$lang$arity$variadic;
  return not_EQ_
}();
cljs.core.not_empty = function not_empty(coll) {
  if(cljs.core.seq.call(null, coll)) {
    return coll
  }else {
    return null
  }
};
cljs.core.every_QMARK_ = function every_QMARK_(pred, coll) {
  while(true) {
    if(cljs.core.seq.call(null, coll) == null) {
      return true
    }else {
      if(cljs.core.truth_(pred.call(null, cljs.core.first.call(null, coll)))) {
        var G__8104 = pred;
        var G__8105 = cljs.core.next.call(null, coll);
        pred = G__8104;
        coll = G__8105;
        continue
      }else {
        if("\ufdd0'else") {
          return false
        }else {
          return null
        }
      }
    }
    break
  }
};
cljs.core.not_every_QMARK_ = function not_every_QMARK_(pred, coll) {
  return!cljs.core.every_QMARK_.call(null, pred, coll)
};
cljs.core.some = function some(pred, coll) {
  while(true) {
    if(cljs.core.seq.call(null, coll)) {
      var or__3824__auto____8107 = pred.call(null, cljs.core.first.call(null, coll));
      if(cljs.core.truth_(or__3824__auto____8107)) {
        return or__3824__auto____8107
      }else {
        var G__8108 = pred;
        var G__8109 = cljs.core.next.call(null, coll);
        pred = G__8108;
        coll = G__8109;
        continue
      }
    }else {
      return null
    }
    break
  }
};
cljs.core.not_any_QMARK_ = function not_any_QMARK_(pred, coll) {
  return cljs.core.not.call(null, cljs.core.some.call(null, pred, coll))
};
cljs.core.even_QMARK_ = function even_QMARK_(n) {
  if(cljs.core.integer_QMARK_.call(null, n)) {
    return(n & 1) === 0
  }else {
    throw new Error([cljs.core.str("Argument must be an integer: "), cljs.core.str(n)].join(""));
  }
};
cljs.core.odd_QMARK_ = function odd_QMARK_(n) {
  return!cljs.core.even_QMARK_.call(null, n)
};
cljs.core.identity = function identity(x) {
  return x
};
cljs.core.complement = function complement(f) {
  return function() {
    var G__8110 = null;
    var G__8110__0 = function() {
      return cljs.core.not.call(null, f.call(null))
    };
    var G__8110__1 = function(x) {
      return cljs.core.not.call(null, f.call(null, x))
    };
    var G__8110__2 = function(x, y) {
      return cljs.core.not.call(null, f.call(null, x, y))
    };
    var G__8110__3 = function() {
      var G__8111__delegate = function(x, y, zs) {
        return cljs.core.not.call(null, cljs.core.apply.call(null, f, x, y, zs))
      };
      var G__8111 = function(x, y, var_args) {
        var zs = null;
        if(goog.isDef(var_args)) {
          zs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
        }
        return G__8111__delegate.call(this, x, y, zs)
      };
      G__8111.cljs$lang$maxFixedArity = 2;
      G__8111.cljs$lang$applyTo = function(arglist__8112) {
        var x = cljs.core.first(arglist__8112);
        var y = cljs.core.first(cljs.core.next(arglist__8112));
        var zs = cljs.core.rest(cljs.core.next(arglist__8112));
        return G__8111__delegate(x, y, zs)
      };
      G__8111.cljs$lang$arity$variadic = G__8111__delegate;
      return G__8111
    }();
    G__8110 = function(x, y, var_args) {
      var zs = var_args;
      switch(arguments.length) {
        case 0:
          return G__8110__0.call(this);
        case 1:
          return G__8110__1.call(this, x);
        case 2:
          return G__8110__2.call(this, x, y);
        default:
          return G__8110__3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
      }
      throw"Invalid arity: " + arguments.length;
    };
    G__8110.cljs$lang$maxFixedArity = 2;
    G__8110.cljs$lang$applyTo = G__8110__3.cljs$lang$applyTo;
    return G__8110
  }()
};
cljs.core.constantly = function constantly(x) {
  return function() {
    var G__8113__delegate = function(args) {
      return x
    };
    var G__8113 = function(var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
      }
      return G__8113__delegate.call(this, args)
    };
    G__8113.cljs$lang$maxFixedArity = 0;
    G__8113.cljs$lang$applyTo = function(arglist__8114) {
      var args = cljs.core.seq(arglist__8114);
      return G__8113__delegate(args)
    };
    G__8113.cljs$lang$arity$variadic = G__8113__delegate;
    return G__8113
  }()
};
cljs.core.comp = function() {
  var comp = null;
  var comp__0 = function() {
    return cljs.core.identity
  };
  var comp__1 = function(f) {
    return f
  };
  var comp__2 = function(f, g) {
    return function() {
      var G__8121 = null;
      var G__8121__0 = function() {
        return f.call(null, g.call(null))
      };
      var G__8121__1 = function(x) {
        return f.call(null, g.call(null, x))
      };
      var G__8121__2 = function(x, y) {
        return f.call(null, g.call(null, x, y))
      };
      var G__8121__3 = function(x, y, z) {
        return f.call(null, g.call(null, x, y, z))
      };
      var G__8121__4 = function() {
        var G__8122__delegate = function(x, y, z, args) {
          return f.call(null, cljs.core.apply.call(null, g, x, y, z, args))
        };
        var G__8122 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8122__delegate.call(this, x, y, z, args)
        };
        G__8122.cljs$lang$maxFixedArity = 3;
        G__8122.cljs$lang$applyTo = function(arglist__8123) {
          var x = cljs.core.first(arglist__8123);
          var y = cljs.core.first(cljs.core.next(arglist__8123));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8123)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8123)));
          return G__8122__delegate(x, y, z, args)
        };
        G__8122.cljs$lang$arity$variadic = G__8122__delegate;
        return G__8122
      }();
      G__8121 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__8121__0.call(this);
          case 1:
            return G__8121__1.call(this, x);
          case 2:
            return G__8121__2.call(this, x, y);
          case 3:
            return G__8121__3.call(this, x, y, z);
          default:
            return G__8121__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__8121.cljs$lang$maxFixedArity = 3;
      G__8121.cljs$lang$applyTo = G__8121__4.cljs$lang$applyTo;
      return G__8121
    }()
  };
  var comp__3 = function(f, g, h) {
    return function() {
      var G__8124 = null;
      var G__8124__0 = function() {
        return f.call(null, g.call(null, h.call(null)))
      };
      var G__8124__1 = function(x) {
        return f.call(null, g.call(null, h.call(null, x)))
      };
      var G__8124__2 = function(x, y) {
        return f.call(null, g.call(null, h.call(null, x, y)))
      };
      var G__8124__3 = function(x, y, z) {
        return f.call(null, g.call(null, h.call(null, x, y, z)))
      };
      var G__8124__4 = function() {
        var G__8125__delegate = function(x, y, z, args) {
          return f.call(null, g.call(null, cljs.core.apply.call(null, h, x, y, z, args)))
        };
        var G__8125 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8125__delegate.call(this, x, y, z, args)
        };
        G__8125.cljs$lang$maxFixedArity = 3;
        G__8125.cljs$lang$applyTo = function(arglist__8126) {
          var x = cljs.core.first(arglist__8126);
          var y = cljs.core.first(cljs.core.next(arglist__8126));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8126)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8126)));
          return G__8125__delegate(x, y, z, args)
        };
        G__8125.cljs$lang$arity$variadic = G__8125__delegate;
        return G__8125
      }();
      G__8124 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__8124__0.call(this);
          case 1:
            return G__8124__1.call(this, x);
          case 2:
            return G__8124__2.call(this, x, y);
          case 3:
            return G__8124__3.call(this, x, y, z);
          default:
            return G__8124__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__8124.cljs$lang$maxFixedArity = 3;
      G__8124.cljs$lang$applyTo = G__8124__4.cljs$lang$applyTo;
      return G__8124
    }()
  };
  var comp__4 = function() {
    var G__8127__delegate = function(f1, f2, f3, fs) {
      var fs__8118 = cljs.core.reverse.call(null, cljs.core.list_STAR_.call(null, f1, f2, f3, fs));
      return function() {
        var G__8128__delegate = function(args) {
          var ret__8119 = cljs.core.apply.call(null, cljs.core.first.call(null, fs__8118), args);
          var fs__8120 = cljs.core.next.call(null, fs__8118);
          while(true) {
            if(fs__8120) {
              var G__8129 = cljs.core.first.call(null, fs__8120).call(null, ret__8119);
              var G__8130 = cljs.core.next.call(null, fs__8120);
              ret__8119 = G__8129;
              fs__8120 = G__8130;
              continue
            }else {
              return ret__8119
            }
            break
          }
        };
        var G__8128 = function(var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
          }
          return G__8128__delegate.call(this, args)
        };
        G__8128.cljs$lang$maxFixedArity = 0;
        G__8128.cljs$lang$applyTo = function(arglist__8131) {
          var args = cljs.core.seq(arglist__8131);
          return G__8128__delegate(args)
        };
        G__8128.cljs$lang$arity$variadic = G__8128__delegate;
        return G__8128
      }()
    };
    var G__8127 = function(f1, f2, f3, var_args) {
      var fs = null;
      if(goog.isDef(var_args)) {
        fs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__8127__delegate.call(this, f1, f2, f3, fs)
    };
    G__8127.cljs$lang$maxFixedArity = 3;
    G__8127.cljs$lang$applyTo = function(arglist__8132) {
      var f1 = cljs.core.first(arglist__8132);
      var f2 = cljs.core.first(cljs.core.next(arglist__8132));
      var f3 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8132)));
      var fs = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8132)));
      return G__8127__delegate(f1, f2, f3, fs)
    };
    G__8127.cljs$lang$arity$variadic = G__8127__delegate;
    return G__8127
  }();
  comp = function(f1, f2, f3, var_args) {
    var fs = var_args;
    switch(arguments.length) {
      case 0:
        return comp__0.call(this);
      case 1:
        return comp__1.call(this, f1);
      case 2:
        return comp__2.call(this, f1, f2);
      case 3:
        return comp__3.call(this, f1, f2, f3);
      default:
        return comp__4.cljs$lang$arity$variadic(f1, f2, f3, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  comp.cljs$lang$maxFixedArity = 3;
  comp.cljs$lang$applyTo = comp__4.cljs$lang$applyTo;
  comp.cljs$lang$arity$0 = comp__0;
  comp.cljs$lang$arity$1 = comp__1;
  comp.cljs$lang$arity$2 = comp__2;
  comp.cljs$lang$arity$3 = comp__3;
  comp.cljs$lang$arity$variadic = comp__4.cljs$lang$arity$variadic;
  return comp
}();
cljs.core.partial = function() {
  var partial = null;
  var partial__2 = function(f, arg1) {
    return function() {
      var G__8133__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, args)
      };
      var G__8133 = function(var_args) {
        var args = null;
        if(goog.isDef(var_args)) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
        }
        return G__8133__delegate.call(this, args)
      };
      G__8133.cljs$lang$maxFixedArity = 0;
      G__8133.cljs$lang$applyTo = function(arglist__8134) {
        var args = cljs.core.seq(arglist__8134);
        return G__8133__delegate(args)
      };
      G__8133.cljs$lang$arity$variadic = G__8133__delegate;
      return G__8133
    }()
  };
  var partial__3 = function(f, arg1, arg2) {
    return function() {
      var G__8135__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, arg2, args)
      };
      var G__8135 = function(var_args) {
        var args = null;
        if(goog.isDef(var_args)) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
        }
        return G__8135__delegate.call(this, args)
      };
      G__8135.cljs$lang$maxFixedArity = 0;
      G__8135.cljs$lang$applyTo = function(arglist__8136) {
        var args = cljs.core.seq(arglist__8136);
        return G__8135__delegate(args)
      };
      G__8135.cljs$lang$arity$variadic = G__8135__delegate;
      return G__8135
    }()
  };
  var partial__4 = function(f, arg1, arg2, arg3) {
    return function() {
      var G__8137__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, arg2, arg3, args)
      };
      var G__8137 = function(var_args) {
        var args = null;
        if(goog.isDef(var_args)) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
        }
        return G__8137__delegate.call(this, args)
      };
      G__8137.cljs$lang$maxFixedArity = 0;
      G__8137.cljs$lang$applyTo = function(arglist__8138) {
        var args = cljs.core.seq(arglist__8138);
        return G__8137__delegate(args)
      };
      G__8137.cljs$lang$arity$variadic = G__8137__delegate;
      return G__8137
    }()
  };
  var partial__5 = function() {
    var G__8139__delegate = function(f, arg1, arg2, arg3, more) {
      return function() {
        var G__8140__delegate = function(args) {
          return cljs.core.apply.call(null, f, arg1, arg2, arg3, cljs.core.concat.call(null, more, args))
        };
        var G__8140 = function(var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
          }
          return G__8140__delegate.call(this, args)
        };
        G__8140.cljs$lang$maxFixedArity = 0;
        G__8140.cljs$lang$applyTo = function(arglist__8141) {
          var args = cljs.core.seq(arglist__8141);
          return G__8140__delegate(args)
        };
        G__8140.cljs$lang$arity$variadic = G__8140__delegate;
        return G__8140
      }()
    };
    var G__8139 = function(f, arg1, arg2, arg3, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__8139__delegate.call(this, f, arg1, arg2, arg3, more)
    };
    G__8139.cljs$lang$maxFixedArity = 4;
    G__8139.cljs$lang$applyTo = function(arglist__8142) {
      var f = cljs.core.first(arglist__8142);
      var arg1 = cljs.core.first(cljs.core.next(arglist__8142));
      var arg2 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8142)));
      var arg3 = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__8142))));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__8142))));
      return G__8139__delegate(f, arg1, arg2, arg3, more)
    };
    G__8139.cljs$lang$arity$variadic = G__8139__delegate;
    return G__8139
  }();
  partial = function(f, arg1, arg2, arg3, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return partial__2.call(this, f, arg1);
      case 3:
        return partial__3.call(this, f, arg1, arg2);
      case 4:
        return partial__4.call(this, f, arg1, arg2, arg3);
      default:
        return partial__5.cljs$lang$arity$variadic(f, arg1, arg2, arg3, cljs.core.array_seq(arguments, 4))
    }
    throw"Invalid arity: " + arguments.length;
  };
  partial.cljs$lang$maxFixedArity = 4;
  partial.cljs$lang$applyTo = partial__5.cljs$lang$applyTo;
  partial.cljs$lang$arity$2 = partial__2;
  partial.cljs$lang$arity$3 = partial__3;
  partial.cljs$lang$arity$4 = partial__4;
  partial.cljs$lang$arity$variadic = partial__5.cljs$lang$arity$variadic;
  return partial
}();
cljs.core.fnil = function() {
  var fnil = null;
  var fnil__2 = function(f, x) {
    return function() {
      var G__8143 = null;
      var G__8143__1 = function(a) {
        return f.call(null, a == null ? x : a)
      };
      var G__8143__2 = function(a, b) {
        return f.call(null, a == null ? x : a, b)
      };
      var G__8143__3 = function(a, b, c) {
        return f.call(null, a == null ? x : a, b, c)
      };
      var G__8143__4 = function() {
        var G__8144__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, a == null ? x : a, b, c, ds)
        };
        var G__8144 = function(a, b, c, var_args) {
          var ds = null;
          if(goog.isDef(var_args)) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8144__delegate.call(this, a, b, c, ds)
        };
        G__8144.cljs$lang$maxFixedArity = 3;
        G__8144.cljs$lang$applyTo = function(arglist__8145) {
          var a = cljs.core.first(arglist__8145);
          var b = cljs.core.first(cljs.core.next(arglist__8145));
          var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8145)));
          var ds = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8145)));
          return G__8144__delegate(a, b, c, ds)
        };
        G__8144.cljs$lang$arity$variadic = G__8144__delegate;
        return G__8144
      }();
      G__8143 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 1:
            return G__8143__1.call(this, a);
          case 2:
            return G__8143__2.call(this, a, b);
          case 3:
            return G__8143__3.call(this, a, b, c);
          default:
            return G__8143__4.cljs$lang$arity$variadic(a, b, c, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__8143.cljs$lang$maxFixedArity = 3;
      G__8143.cljs$lang$applyTo = G__8143__4.cljs$lang$applyTo;
      return G__8143
    }()
  };
  var fnil__3 = function(f, x, y) {
    return function() {
      var G__8146 = null;
      var G__8146__2 = function(a, b) {
        return f.call(null, a == null ? x : a, b == null ? y : b)
      };
      var G__8146__3 = function(a, b, c) {
        return f.call(null, a == null ? x : a, b == null ? y : b, c)
      };
      var G__8146__4 = function() {
        var G__8147__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, a == null ? x : a, b == null ? y : b, c, ds)
        };
        var G__8147 = function(a, b, c, var_args) {
          var ds = null;
          if(goog.isDef(var_args)) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8147__delegate.call(this, a, b, c, ds)
        };
        G__8147.cljs$lang$maxFixedArity = 3;
        G__8147.cljs$lang$applyTo = function(arglist__8148) {
          var a = cljs.core.first(arglist__8148);
          var b = cljs.core.first(cljs.core.next(arglist__8148));
          var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8148)));
          var ds = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8148)));
          return G__8147__delegate(a, b, c, ds)
        };
        G__8147.cljs$lang$arity$variadic = G__8147__delegate;
        return G__8147
      }();
      G__8146 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 2:
            return G__8146__2.call(this, a, b);
          case 3:
            return G__8146__3.call(this, a, b, c);
          default:
            return G__8146__4.cljs$lang$arity$variadic(a, b, c, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__8146.cljs$lang$maxFixedArity = 3;
      G__8146.cljs$lang$applyTo = G__8146__4.cljs$lang$applyTo;
      return G__8146
    }()
  };
  var fnil__4 = function(f, x, y, z) {
    return function() {
      var G__8149 = null;
      var G__8149__2 = function(a, b) {
        return f.call(null, a == null ? x : a, b == null ? y : b)
      };
      var G__8149__3 = function(a, b, c) {
        return f.call(null, a == null ? x : a, b == null ? y : b, c == null ? z : c)
      };
      var G__8149__4 = function() {
        var G__8150__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, a == null ? x : a, b == null ? y : b, c == null ? z : c, ds)
        };
        var G__8150 = function(a, b, c, var_args) {
          var ds = null;
          if(goog.isDef(var_args)) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8150__delegate.call(this, a, b, c, ds)
        };
        G__8150.cljs$lang$maxFixedArity = 3;
        G__8150.cljs$lang$applyTo = function(arglist__8151) {
          var a = cljs.core.first(arglist__8151);
          var b = cljs.core.first(cljs.core.next(arglist__8151));
          var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8151)));
          var ds = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8151)));
          return G__8150__delegate(a, b, c, ds)
        };
        G__8150.cljs$lang$arity$variadic = G__8150__delegate;
        return G__8150
      }();
      G__8149 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 2:
            return G__8149__2.call(this, a, b);
          case 3:
            return G__8149__3.call(this, a, b, c);
          default:
            return G__8149__4.cljs$lang$arity$variadic(a, b, c, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__8149.cljs$lang$maxFixedArity = 3;
      G__8149.cljs$lang$applyTo = G__8149__4.cljs$lang$applyTo;
      return G__8149
    }()
  };
  fnil = function(f, x, y, z) {
    switch(arguments.length) {
      case 2:
        return fnil__2.call(this, f, x);
      case 3:
        return fnil__3.call(this, f, x, y);
      case 4:
        return fnil__4.call(this, f, x, y, z)
    }
    throw"Invalid arity: " + arguments.length;
  };
  fnil.cljs$lang$arity$2 = fnil__2;
  fnil.cljs$lang$arity$3 = fnil__3;
  fnil.cljs$lang$arity$4 = fnil__4;
  return fnil
}();
cljs.core.map_indexed = function map_indexed(f, coll) {
  var mapi__8167 = function mapi(idx, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____8175 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____8175) {
        var s__8176 = temp__3974__auto____8175;
        if(cljs.core.chunked_seq_QMARK_.call(null, s__8176)) {
          var c__8177 = cljs.core.chunk_first.call(null, s__8176);
          var size__8178 = cljs.core.count.call(null, c__8177);
          var b__8179 = cljs.core.chunk_buffer.call(null, size__8178);
          var n__2523__auto____8180 = size__8178;
          var i__8181 = 0;
          while(true) {
            if(i__8181 < n__2523__auto____8180) {
              cljs.core.chunk_append.call(null, b__8179, f.call(null, idx + i__8181, cljs.core._nth.call(null, c__8177, i__8181)));
              var G__8182 = i__8181 + 1;
              i__8181 = G__8182;
              continue
            }else {
            }
            break
          }
          return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b__8179), mapi.call(null, idx + size__8178, cljs.core.chunk_rest.call(null, s__8176)))
        }else {
          return cljs.core.cons.call(null, f.call(null, idx, cljs.core.first.call(null, s__8176)), mapi.call(null, idx + 1, cljs.core.rest.call(null, s__8176)))
        }
      }else {
        return null
      }
    }, null)
  };
  return mapi__8167.call(null, 0, coll)
};
cljs.core.keep = function keep(f, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____8192 = cljs.core.seq.call(null, coll);
    if(temp__3974__auto____8192) {
      var s__8193 = temp__3974__auto____8192;
      if(cljs.core.chunked_seq_QMARK_.call(null, s__8193)) {
        var c__8194 = cljs.core.chunk_first.call(null, s__8193);
        var size__8195 = cljs.core.count.call(null, c__8194);
        var b__8196 = cljs.core.chunk_buffer.call(null, size__8195);
        var n__2523__auto____8197 = size__8195;
        var i__8198 = 0;
        while(true) {
          if(i__8198 < n__2523__auto____8197) {
            var x__8199 = f.call(null, cljs.core._nth.call(null, c__8194, i__8198));
            if(x__8199 == null) {
            }else {
              cljs.core.chunk_append.call(null, b__8196, x__8199)
            }
            var G__8201 = i__8198 + 1;
            i__8198 = G__8201;
            continue
          }else {
          }
          break
        }
        return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b__8196), keep.call(null, f, cljs.core.chunk_rest.call(null, s__8193)))
      }else {
        var x__8200 = f.call(null, cljs.core.first.call(null, s__8193));
        if(x__8200 == null) {
          return keep.call(null, f, cljs.core.rest.call(null, s__8193))
        }else {
          return cljs.core.cons.call(null, x__8200, keep.call(null, f, cljs.core.rest.call(null, s__8193)))
        }
      }
    }else {
      return null
    }
  }, null)
};
cljs.core.keep_indexed = function keep_indexed(f, coll) {
  var keepi__8227 = function keepi(idx, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____8237 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____8237) {
        var s__8238 = temp__3974__auto____8237;
        if(cljs.core.chunked_seq_QMARK_.call(null, s__8238)) {
          var c__8239 = cljs.core.chunk_first.call(null, s__8238);
          var size__8240 = cljs.core.count.call(null, c__8239);
          var b__8241 = cljs.core.chunk_buffer.call(null, size__8240);
          var n__2523__auto____8242 = size__8240;
          var i__8243 = 0;
          while(true) {
            if(i__8243 < n__2523__auto____8242) {
              var x__8244 = f.call(null, idx + i__8243, cljs.core._nth.call(null, c__8239, i__8243));
              if(x__8244 == null) {
              }else {
                cljs.core.chunk_append.call(null, b__8241, x__8244)
              }
              var G__8246 = i__8243 + 1;
              i__8243 = G__8246;
              continue
            }else {
            }
            break
          }
          return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b__8241), keepi.call(null, idx + size__8240, cljs.core.chunk_rest.call(null, s__8238)))
        }else {
          var x__8245 = f.call(null, idx, cljs.core.first.call(null, s__8238));
          if(x__8245 == null) {
            return keepi.call(null, idx + 1, cljs.core.rest.call(null, s__8238))
          }else {
            return cljs.core.cons.call(null, x__8245, keepi.call(null, idx + 1, cljs.core.rest.call(null, s__8238)))
          }
        }
      }else {
        return null
      }
    }, null)
  };
  return keepi__8227.call(null, 0, coll)
};
cljs.core.every_pred = function() {
  var every_pred = null;
  var every_pred__1 = function(p) {
    return function() {
      var ep1 = null;
      var ep1__0 = function() {
        return true
      };
      var ep1__1 = function(x) {
        return cljs.core.boolean$.call(null, p.call(null, x))
      };
      var ep1__2 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____8332 = p.call(null, x);
          if(cljs.core.truth_(and__3822__auto____8332)) {
            return p.call(null, y)
          }else {
            return and__3822__auto____8332
          }
        }())
      };
      var ep1__3 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____8333 = p.call(null, x);
          if(cljs.core.truth_(and__3822__auto____8333)) {
            var and__3822__auto____8334 = p.call(null, y);
            if(cljs.core.truth_(and__3822__auto____8334)) {
              return p.call(null, z)
            }else {
              return and__3822__auto____8334
            }
          }else {
            return and__3822__auto____8333
          }
        }())
      };
      var ep1__4 = function() {
        var G__8403__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, function() {
            var and__3822__auto____8335 = ep1.call(null, x, y, z);
            if(cljs.core.truth_(and__3822__auto____8335)) {
              return cljs.core.every_QMARK_.call(null, p, args)
            }else {
              return and__3822__auto____8335
            }
          }())
        };
        var G__8403 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8403__delegate.call(this, x, y, z, args)
        };
        G__8403.cljs$lang$maxFixedArity = 3;
        G__8403.cljs$lang$applyTo = function(arglist__8404) {
          var x = cljs.core.first(arglist__8404);
          var y = cljs.core.first(cljs.core.next(arglist__8404));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8404)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8404)));
          return G__8403__delegate(x, y, z, args)
        };
        G__8403.cljs$lang$arity$variadic = G__8403__delegate;
        return G__8403
      }();
      ep1 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep1__0.call(this);
          case 1:
            return ep1__1.call(this, x);
          case 2:
            return ep1__2.call(this, x, y);
          case 3:
            return ep1__3.call(this, x, y, z);
          default:
            return ep1__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      ep1.cljs$lang$maxFixedArity = 3;
      ep1.cljs$lang$applyTo = ep1__4.cljs$lang$applyTo;
      ep1.cljs$lang$arity$0 = ep1__0;
      ep1.cljs$lang$arity$1 = ep1__1;
      ep1.cljs$lang$arity$2 = ep1__2;
      ep1.cljs$lang$arity$3 = ep1__3;
      ep1.cljs$lang$arity$variadic = ep1__4.cljs$lang$arity$variadic;
      return ep1
    }()
  };
  var every_pred__2 = function(p1, p2) {
    return function() {
      var ep2 = null;
      var ep2__0 = function() {
        return true
      };
      var ep2__1 = function(x) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____8347 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____8347)) {
            return p2.call(null, x)
          }else {
            return and__3822__auto____8347
          }
        }())
      };
      var ep2__2 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____8348 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____8348)) {
            var and__3822__auto____8349 = p1.call(null, y);
            if(cljs.core.truth_(and__3822__auto____8349)) {
              var and__3822__auto____8350 = p2.call(null, x);
              if(cljs.core.truth_(and__3822__auto____8350)) {
                return p2.call(null, y)
              }else {
                return and__3822__auto____8350
              }
            }else {
              return and__3822__auto____8349
            }
          }else {
            return and__3822__auto____8348
          }
        }())
      };
      var ep2__3 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____8351 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____8351)) {
            var and__3822__auto____8352 = p1.call(null, y);
            if(cljs.core.truth_(and__3822__auto____8352)) {
              var and__3822__auto____8353 = p1.call(null, z);
              if(cljs.core.truth_(and__3822__auto____8353)) {
                var and__3822__auto____8354 = p2.call(null, x);
                if(cljs.core.truth_(and__3822__auto____8354)) {
                  var and__3822__auto____8355 = p2.call(null, y);
                  if(cljs.core.truth_(and__3822__auto____8355)) {
                    return p2.call(null, z)
                  }else {
                    return and__3822__auto____8355
                  }
                }else {
                  return and__3822__auto____8354
                }
              }else {
                return and__3822__auto____8353
              }
            }else {
              return and__3822__auto____8352
            }
          }else {
            return and__3822__auto____8351
          }
        }())
      };
      var ep2__4 = function() {
        var G__8405__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, function() {
            var and__3822__auto____8356 = ep2.call(null, x, y, z);
            if(cljs.core.truth_(and__3822__auto____8356)) {
              return cljs.core.every_QMARK_.call(null, function(p1__8202_SHARP_) {
                var and__3822__auto____8357 = p1.call(null, p1__8202_SHARP_);
                if(cljs.core.truth_(and__3822__auto____8357)) {
                  return p2.call(null, p1__8202_SHARP_)
                }else {
                  return and__3822__auto____8357
                }
              }, args)
            }else {
              return and__3822__auto____8356
            }
          }())
        };
        var G__8405 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8405__delegate.call(this, x, y, z, args)
        };
        G__8405.cljs$lang$maxFixedArity = 3;
        G__8405.cljs$lang$applyTo = function(arglist__8406) {
          var x = cljs.core.first(arglist__8406);
          var y = cljs.core.first(cljs.core.next(arglist__8406));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8406)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8406)));
          return G__8405__delegate(x, y, z, args)
        };
        G__8405.cljs$lang$arity$variadic = G__8405__delegate;
        return G__8405
      }();
      ep2 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep2__0.call(this);
          case 1:
            return ep2__1.call(this, x);
          case 2:
            return ep2__2.call(this, x, y);
          case 3:
            return ep2__3.call(this, x, y, z);
          default:
            return ep2__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      ep2.cljs$lang$maxFixedArity = 3;
      ep2.cljs$lang$applyTo = ep2__4.cljs$lang$applyTo;
      ep2.cljs$lang$arity$0 = ep2__0;
      ep2.cljs$lang$arity$1 = ep2__1;
      ep2.cljs$lang$arity$2 = ep2__2;
      ep2.cljs$lang$arity$3 = ep2__3;
      ep2.cljs$lang$arity$variadic = ep2__4.cljs$lang$arity$variadic;
      return ep2
    }()
  };
  var every_pred__3 = function(p1, p2, p3) {
    return function() {
      var ep3 = null;
      var ep3__0 = function() {
        return true
      };
      var ep3__1 = function(x) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____8376 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____8376)) {
            var and__3822__auto____8377 = p2.call(null, x);
            if(cljs.core.truth_(and__3822__auto____8377)) {
              return p3.call(null, x)
            }else {
              return and__3822__auto____8377
            }
          }else {
            return and__3822__auto____8376
          }
        }())
      };
      var ep3__2 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____8378 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____8378)) {
            var and__3822__auto____8379 = p2.call(null, x);
            if(cljs.core.truth_(and__3822__auto____8379)) {
              var and__3822__auto____8380 = p3.call(null, x);
              if(cljs.core.truth_(and__3822__auto____8380)) {
                var and__3822__auto____8381 = p1.call(null, y);
                if(cljs.core.truth_(and__3822__auto____8381)) {
                  var and__3822__auto____8382 = p2.call(null, y);
                  if(cljs.core.truth_(and__3822__auto____8382)) {
                    return p3.call(null, y)
                  }else {
                    return and__3822__auto____8382
                  }
                }else {
                  return and__3822__auto____8381
                }
              }else {
                return and__3822__auto____8380
              }
            }else {
              return and__3822__auto____8379
            }
          }else {
            return and__3822__auto____8378
          }
        }())
      };
      var ep3__3 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____8383 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____8383)) {
            var and__3822__auto____8384 = p2.call(null, x);
            if(cljs.core.truth_(and__3822__auto____8384)) {
              var and__3822__auto____8385 = p3.call(null, x);
              if(cljs.core.truth_(and__3822__auto____8385)) {
                var and__3822__auto____8386 = p1.call(null, y);
                if(cljs.core.truth_(and__3822__auto____8386)) {
                  var and__3822__auto____8387 = p2.call(null, y);
                  if(cljs.core.truth_(and__3822__auto____8387)) {
                    var and__3822__auto____8388 = p3.call(null, y);
                    if(cljs.core.truth_(and__3822__auto____8388)) {
                      var and__3822__auto____8389 = p1.call(null, z);
                      if(cljs.core.truth_(and__3822__auto____8389)) {
                        var and__3822__auto____8390 = p2.call(null, z);
                        if(cljs.core.truth_(and__3822__auto____8390)) {
                          return p3.call(null, z)
                        }else {
                          return and__3822__auto____8390
                        }
                      }else {
                        return and__3822__auto____8389
                      }
                    }else {
                      return and__3822__auto____8388
                    }
                  }else {
                    return and__3822__auto____8387
                  }
                }else {
                  return and__3822__auto____8386
                }
              }else {
                return and__3822__auto____8385
              }
            }else {
              return and__3822__auto____8384
            }
          }else {
            return and__3822__auto____8383
          }
        }())
      };
      var ep3__4 = function() {
        var G__8407__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, function() {
            var and__3822__auto____8391 = ep3.call(null, x, y, z);
            if(cljs.core.truth_(and__3822__auto____8391)) {
              return cljs.core.every_QMARK_.call(null, function(p1__8203_SHARP_) {
                var and__3822__auto____8392 = p1.call(null, p1__8203_SHARP_);
                if(cljs.core.truth_(and__3822__auto____8392)) {
                  var and__3822__auto____8393 = p2.call(null, p1__8203_SHARP_);
                  if(cljs.core.truth_(and__3822__auto____8393)) {
                    return p3.call(null, p1__8203_SHARP_)
                  }else {
                    return and__3822__auto____8393
                  }
                }else {
                  return and__3822__auto____8392
                }
              }, args)
            }else {
              return and__3822__auto____8391
            }
          }())
        };
        var G__8407 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8407__delegate.call(this, x, y, z, args)
        };
        G__8407.cljs$lang$maxFixedArity = 3;
        G__8407.cljs$lang$applyTo = function(arglist__8408) {
          var x = cljs.core.first(arglist__8408);
          var y = cljs.core.first(cljs.core.next(arglist__8408));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8408)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8408)));
          return G__8407__delegate(x, y, z, args)
        };
        G__8407.cljs$lang$arity$variadic = G__8407__delegate;
        return G__8407
      }();
      ep3 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep3__0.call(this);
          case 1:
            return ep3__1.call(this, x);
          case 2:
            return ep3__2.call(this, x, y);
          case 3:
            return ep3__3.call(this, x, y, z);
          default:
            return ep3__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      ep3.cljs$lang$maxFixedArity = 3;
      ep3.cljs$lang$applyTo = ep3__4.cljs$lang$applyTo;
      ep3.cljs$lang$arity$0 = ep3__0;
      ep3.cljs$lang$arity$1 = ep3__1;
      ep3.cljs$lang$arity$2 = ep3__2;
      ep3.cljs$lang$arity$3 = ep3__3;
      ep3.cljs$lang$arity$variadic = ep3__4.cljs$lang$arity$variadic;
      return ep3
    }()
  };
  var every_pred__4 = function() {
    var G__8409__delegate = function(p1, p2, p3, ps) {
      var ps__8394 = cljs.core.list_STAR_.call(null, p1, p2, p3, ps);
      return function() {
        var epn = null;
        var epn__0 = function() {
          return true
        };
        var epn__1 = function(x) {
          return cljs.core.every_QMARK_.call(null, function(p1__8204_SHARP_) {
            return p1__8204_SHARP_.call(null, x)
          }, ps__8394)
        };
        var epn__2 = function(x, y) {
          return cljs.core.every_QMARK_.call(null, function(p1__8205_SHARP_) {
            var and__3822__auto____8399 = p1__8205_SHARP_.call(null, x);
            if(cljs.core.truth_(and__3822__auto____8399)) {
              return p1__8205_SHARP_.call(null, y)
            }else {
              return and__3822__auto____8399
            }
          }, ps__8394)
        };
        var epn__3 = function(x, y, z) {
          return cljs.core.every_QMARK_.call(null, function(p1__8206_SHARP_) {
            var and__3822__auto____8400 = p1__8206_SHARP_.call(null, x);
            if(cljs.core.truth_(and__3822__auto____8400)) {
              var and__3822__auto____8401 = p1__8206_SHARP_.call(null, y);
              if(cljs.core.truth_(and__3822__auto____8401)) {
                return p1__8206_SHARP_.call(null, z)
              }else {
                return and__3822__auto____8401
              }
            }else {
              return and__3822__auto____8400
            }
          }, ps__8394)
        };
        var epn__4 = function() {
          var G__8410__delegate = function(x, y, z, args) {
            return cljs.core.boolean$.call(null, function() {
              var and__3822__auto____8402 = epn.call(null, x, y, z);
              if(cljs.core.truth_(and__3822__auto____8402)) {
                return cljs.core.every_QMARK_.call(null, function(p1__8207_SHARP_) {
                  return cljs.core.every_QMARK_.call(null, p1__8207_SHARP_, args)
                }, ps__8394)
              }else {
                return and__3822__auto____8402
              }
            }())
          };
          var G__8410 = function(x, y, z, var_args) {
            var args = null;
            if(goog.isDef(var_args)) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
            }
            return G__8410__delegate.call(this, x, y, z, args)
          };
          G__8410.cljs$lang$maxFixedArity = 3;
          G__8410.cljs$lang$applyTo = function(arglist__8411) {
            var x = cljs.core.first(arglist__8411);
            var y = cljs.core.first(cljs.core.next(arglist__8411));
            var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8411)));
            var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8411)));
            return G__8410__delegate(x, y, z, args)
          };
          G__8410.cljs$lang$arity$variadic = G__8410__delegate;
          return G__8410
        }();
        epn = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return epn__0.call(this);
            case 1:
              return epn__1.call(this, x);
            case 2:
              return epn__2.call(this, x, y);
            case 3:
              return epn__3.call(this, x, y, z);
            default:
              return epn__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
          }
          throw"Invalid arity: " + arguments.length;
        };
        epn.cljs$lang$maxFixedArity = 3;
        epn.cljs$lang$applyTo = epn__4.cljs$lang$applyTo;
        epn.cljs$lang$arity$0 = epn__0;
        epn.cljs$lang$arity$1 = epn__1;
        epn.cljs$lang$arity$2 = epn__2;
        epn.cljs$lang$arity$3 = epn__3;
        epn.cljs$lang$arity$variadic = epn__4.cljs$lang$arity$variadic;
        return epn
      }()
    };
    var G__8409 = function(p1, p2, p3, var_args) {
      var ps = null;
      if(goog.isDef(var_args)) {
        ps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__8409__delegate.call(this, p1, p2, p3, ps)
    };
    G__8409.cljs$lang$maxFixedArity = 3;
    G__8409.cljs$lang$applyTo = function(arglist__8412) {
      var p1 = cljs.core.first(arglist__8412);
      var p2 = cljs.core.first(cljs.core.next(arglist__8412));
      var p3 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8412)));
      var ps = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8412)));
      return G__8409__delegate(p1, p2, p3, ps)
    };
    G__8409.cljs$lang$arity$variadic = G__8409__delegate;
    return G__8409
  }();
  every_pred = function(p1, p2, p3, var_args) {
    var ps = var_args;
    switch(arguments.length) {
      case 1:
        return every_pred__1.call(this, p1);
      case 2:
        return every_pred__2.call(this, p1, p2);
      case 3:
        return every_pred__3.call(this, p1, p2, p3);
      default:
        return every_pred__4.cljs$lang$arity$variadic(p1, p2, p3, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  every_pred.cljs$lang$maxFixedArity = 3;
  every_pred.cljs$lang$applyTo = every_pred__4.cljs$lang$applyTo;
  every_pred.cljs$lang$arity$1 = every_pred__1;
  every_pred.cljs$lang$arity$2 = every_pred__2;
  every_pred.cljs$lang$arity$3 = every_pred__3;
  every_pred.cljs$lang$arity$variadic = every_pred__4.cljs$lang$arity$variadic;
  return every_pred
}();
cljs.core.some_fn = function() {
  var some_fn = null;
  var some_fn__1 = function(p) {
    return function() {
      var sp1 = null;
      var sp1__0 = function() {
        return null
      };
      var sp1__1 = function(x) {
        return p.call(null, x)
      };
      var sp1__2 = function(x, y) {
        var or__3824__auto____8493 = p.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8493)) {
          return or__3824__auto____8493
        }else {
          return p.call(null, y)
        }
      };
      var sp1__3 = function(x, y, z) {
        var or__3824__auto____8494 = p.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8494)) {
          return or__3824__auto____8494
        }else {
          var or__3824__auto____8495 = p.call(null, y);
          if(cljs.core.truth_(or__3824__auto____8495)) {
            return or__3824__auto____8495
          }else {
            return p.call(null, z)
          }
        }
      };
      var sp1__4 = function() {
        var G__8564__delegate = function(x, y, z, args) {
          var or__3824__auto____8496 = sp1.call(null, x, y, z);
          if(cljs.core.truth_(or__3824__auto____8496)) {
            return or__3824__auto____8496
          }else {
            return cljs.core.some.call(null, p, args)
          }
        };
        var G__8564 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8564__delegate.call(this, x, y, z, args)
        };
        G__8564.cljs$lang$maxFixedArity = 3;
        G__8564.cljs$lang$applyTo = function(arglist__8565) {
          var x = cljs.core.first(arglist__8565);
          var y = cljs.core.first(cljs.core.next(arglist__8565));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8565)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8565)));
          return G__8564__delegate(x, y, z, args)
        };
        G__8564.cljs$lang$arity$variadic = G__8564__delegate;
        return G__8564
      }();
      sp1 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp1__0.call(this);
          case 1:
            return sp1__1.call(this, x);
          case 2:
            return sp1__2.call(this, x, y);
          case 3:
            return sp1__3.call(this, x, y, z);
          default:
            return sp1__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      sp1.cljs$lang$maxFixedArity = 3;
      sp1.cljs$lang$applyTo = sp1__4.cljs$lang$applyTo;
      sp1.cljs$lang$arity$0 = sp1__0;
      sp1.cljs$lang$arity$1 = sp1__1;
      sp1.cljs$lang$arity$2 = sp1__2;
      sp1.cljs$lang$arity$3 = sp1__3;
      sp1.cljs$lang$arity$variadic = sp1__4.cljs$lang$arity$variadic;
      return sp1
    }()
  };
  var some_fn__2 = function(p1, p2) {
    return function() {
      var sp2 = null;
      var sp2__0 = function() {
        return null
      };
      var sp2__1 = function(x) {
        var or__3824__auto____8508 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8508)) {
          return or__3824__auto____8508
        }else {
          return p2.call(null, x)
        }
      };
      var sp2__2 = function(x, y) {
        var or__3824__auto____8509 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8509)) {
          return or__3824__auto____8509
        }else {
          var or__3824__auto____8510 = p1.call(null, y);
          if(cljs.core.truth_(or__3824__auto____8510)) {
            return or__3824__auto____8510
          }else {
            var or__3824__auto____8511 = p2.call(null, x);
            if(cljs.core.truth_(or__3824__auto____8511)) {
              return or__3824__auto____8511
            }else {
              return p2.call(null, y)
            }
          }
        }
      };
      var sp2__3 = function(x, y, z) {
        var or__3824__auto____8512 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8512)) {
          return or__3824__auto____8512
        }else {
          var or__3824__auto____8513 = p1.call(null, y);
          if(cljs.core.truth_(or__3824__auto____8513)) {
            return or__3824__auto____8513
          }else {
            var or__3824__auto____8514 = p1.call(null, z);
            if(cljs.core.truth_(or__3824__auto____8514)) {
              return or__3824__auto____8514
            }else {
              var or__3824__auto____8515 = p2.call(null, x);
              if(cljs.core.truth_(or__3824__auto____8515)) {
                return or__3824__auto____8515
              }else {
                var or__3824__auto____8516 = p2.call(null, y);
                if(cljs.core.truth_(or__3824__auto____8516)) {
                  return or__3824__auto____8516
                }else {
                  return p2.call(null, z)
                }
              }
            }
          }
        }
      };
      var sp2__4 = function() {
        var G__8566__delegate = function(x, y, z, args) {
          var or__3824__auto____8517 = sp2.call(null, x, y, z);
          if(cljs.core.truth_(or__3824__auto____8517)) {
            return or__3824__auto____8517
          }else {
            return cljs.core.some.call(null, function(p1__8247_SHARP_) {
              var or__3824__auto____8518 = p1.call(null, p1__8247_SHARP_);
              if(cljs.core.truth_(or__3824__auto____8518)) {
                return or__3824__auto____8518
              }else {
                return p2.call(null, p1__8247_SHARP_)
              }
            }, args)
          }
        };
        var G__8566 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8566__delegate.call(this, x, y, z, args)
        };
        G__8566.cljs$lang$maxFixedArity = 3;
        G__8566.cljs$lang$applyTo = function(arglist__8567) {
          var x = cljs.core.first(arglist__8567);
          var y = cljs.core.first(cljs.core.next(arglist__8567));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8567)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8567)));
          return G__8566__delegate(x, y, z, args)
        };
        G__8566.cljs$lang$arity$variadic = G__8566__delegate;
        return G__8566
      }();
      sp2 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp2__0.call(this);
          case 1:
            return sp2__1.call(this, x);
          case 2:
            return sp2__2.call(this, x, y);
          case 3:
            return sp2__3.call(this, x, y, z);
          default:
            return sp2__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      sp2.cljs$lang$maxFixedArity = 3;
      sp2.cljs$lang$applyTo = sp2__4.cljs$lang$applyTo;
      sp2.cljs$lang$arity$0 = sp2__0;
      sp2.cljs$lang$arity$1 = sp2__1;
      sp2.cljs$lang$arity$2 = sp2__2;
      sp2.cljs$lang$arity$3 = sp2__3;
      sp2.cljs$lang$arity$variadic = sp2__4.cljs$lang$arity$variadic;
      return sp2
    }()
  };
  var some_fn__3 = function(p1, p2, p3) {
    return function() {
      var sp3 = null;
      var sp3__0 = function() {
        return null
      };
      var sp3__1 = function(x) {
        var or__3824__auto____8537 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8537)) {
          return or__3824__auto____8537
        }else {
          var or__3824__auto____8538 = p2.call(null, x);
          if(cljs.core.truth_(or__3824__auto____8538)) {
            return or__3824__auto____8538
          }else {
            return p3.call(null, x)
          }
        }
      };
      var sp3__2 = function(x, y) {
        var or__3824__auto____8539 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8539)) {
          return or__3824__auto____8539
        }else {
          var or__3824__auto____8540 = p2.call(null, x);
          if(cljs.core.truth_(or__3824__auto____8540)) {
            return or__3824__auto____8540
          }else {
            var or__3824__auto____8541 = p3.call(null, x);
            if(cljs.core.truth_(or__3824__auto____8541)) {
              return or__3824__auto____8541
            }else {
              var or__3824__auto____8542 = p1.call(null, y);
              if(cljs.core.truth_(or__3824__auto____8542)) {
                return or__3824__auto____8542
              }else {
                var or__3824__auto____8543 = p2.call(null, y);
                if(cljs.core.truth_(or__3824__auto____8543)) {
                  return or__3824__auto____8543
                }else {
                  return p3.call(null, y)
                }
              }
            }
          }
        }
      };
      var sp3__3 = function(x, y, z) {
        var or__3824__auto____8544 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8544)) {
          return or__3824__auto____8544
        }else {
          var or__3824__auto____8545 = p2.call(null, x);
          if(cljs.core.truth_(or__3824__auto____8545)) {
            return or__3824__auto____8545
          }else {
            var or__3824__auto____8546 = p3.call(null, x);
            if(cljs.core.truth_(or__3824__auto____8546)) {
              return or__3824__auto____8546
            }else {
              var or__3824__auto____8547 = p1.call(null, y);
              if(cljs.core.truth_(or__3824__auto____8547)) {
                return or__3824__auto____8547
              }else {
                var or__3824__auto____8548 = p2.call(null, y);
                if(cljs.core.truth_(or__3824__auto____8548)) {
                  return or__3824__auto____8548
                }else {
                  var or__3824__auto____8549 = p3.call(null, y);
                  if(cljs.core.truth_(or__3824__auto____8549)) {
                    return or__3824__auto____8549
                  }else {
                    var or__3824__auto____8550 = p1.call(null, z);
                    if(cljs.core.truth_(or__3824__auto____8550)) {
                      return or__3824__auto____8550
                    }else {
                      var or__3824__auto____8551 = p2.call(null, z);
                      if(cljs.core.truth_(or__3824__auto____8551)) {
                        return or__3824__auto____8551
                      }else {
                        return p3.call(null, z)
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };
      var sp3__4 = function() {
        var G__8568__delegate = function(x, y, z, args) {
          var or__3824__auto____8552 = sp3.call(null, x, y, z);
          if(cljs.core.truth_(or__3824__auto____8552)) {
            return or__3824__auto____8552
          }else {
            return cljs.core.some.call(null, function(p1__8248_SHARP_) {
              var or__3824__auto____8553 = p1.call(null, p1__8248_SHARP_);
              if(cljs.core.truth_(or__3824__auto____8553)) {
                return or__3824__auto____8553
              }else {
                var or__3824__auto____8554 = p2.call(null, p1__8248_SHARP_);
                if(cljs.core.truth_(or__3824__auto____8554)) {
                  return or__3824__auto____8554
                }else {
                  return p3.call(null, p1__8248_SHARP_)
                }
              }
            }, args)
          }
        };
        var G__8568 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8568__delegate.call(this, x, y, z, args)
        };
        G__8568.cljs$lang$maxFixedArity = 3;
        G__8568.cljs$lang$applyTo = function(arglist__8569) {
          var x = cljs.core.first(arglist__8569);
          var y = cljs.core.first(cljs.core.next(arglist__8569));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8569)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8569)));
          return G__8568__delegate(x, y, z, args)
        };
        G__8568.cljs$lang$arity$variadic = G__8568__delegate;
        return G__8568
      }();
      sp3 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp3__0.call(this);
          case 1:
            return sp3__1.call(this, x);
          case 2:
            return sp3__2.call(this, x, y);
          case 3:
            return sp3__3.call(this, x, y, z);
          default:
            return sp3__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      sp3.cljs$lang$maxFixedArity = 3;
      sp3.cljs$lang$applyTo = sp3__4.cljs$lang$applyTo;
      sp3.cljs$lang$arity$0 = sp3__0;
      sp3.cljs$lang$arity$1 = sp3__1;
      sp3.cljs$lang$arity$2 = sp3__2;
      sp3.cljs$lang$arity$3 = sp3__3;
      sp3.cljs$lang$arity$variadic = sp3__4.cljs$lang$arity$variadic;
      return sp3
    }()
  };
  var some_fn__4 = function() {
    var G__8570__delegate = function(p1, p2, p3, ps) {
      var ps__8555 = cljs.core.list_STAR_.call(null, p1, p2, p3, ps);
      return function() {
        var spn = null;
        var spn__0 = function() {
          return null
        };
        var spn__1 = function(x) {
          return cljs.core.some.call(null, function(p1__8249_SHARP_) {
            return p1__8249_SHARP_.call(null, x)
          }, ps__8555)
        };
        var spn__2 = function(x, y) {
          return cljs.core.some.call(null, function(p1__8250_SHARP_) {
            var or__3824__auto____8560 = p1__8250_SHARP_.call(null, x);
            if(cljs.core.truth_(or__3824__auto____8560)) {
              return or__3824__auto____8560
            }else {
              return p1__8250_SHARP_.call(null, y)
            }
          }, ps__8555)
        };
        var spn__3 = function(x, y, z) {
          return cljs.core.some.call(null, function(p1__8251_SHARP_) {
            var or__3824__auto____8561 = p1__8251_SHARP_.call(null, x);
            if(cljs.core.truth_(or__3824__auto____8561)) {
              return or__3824__auto____8561
            }else {
              var or__3824__auto____8562 = p1__8251_SHARP_.call(null, y);
              if(cljs.core.truth_(or__3824__auto____8562)) {
                return or__3824__auto____8562
              }else {
                return p1__8251_SHARP_.call(null, z)
              }
            }
          }, ps__8555)
        };
        var spn__4 = function() {
          var G__8571__delegate = function(x, y, z, args) {
            var or__3824__auto____8563 = spn.call(null, x, y, z);
            if(cljs.core.truth_(or__3824__auto____8563)) {
              return or__3824__auto____8563
            }else {
              return cljs.core.some.call(null, function(p1__8252_SHARP_) {
                return cljs.core.some.call(null, p1__8252_SHARP_, args)
              }, ps__8555)
            }
          };
          var G__8571 = function(x, y, z, var_args) {
            var args = null;
            if(goog.isDef(var_args)) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
            }
            return G__8571__delegate.call(this, x, y, z, args)
          };
          G__8571.cljs$lang$maxFixedArity = 3;
          G__8571.cljs$lang$applyTo = function(arglist__8572) {
            var x = cljs.core.first(arglist__8572);
            var y = cljs.core.first(cljs.core.next(arglist__8572));
            var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8572)));
            var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8572)));
            return G__8571__delegate(x, y, z, args)
          };
          G__8571.cljs$lang$arity$variadic = G__8571__delegate;
          return G__8571
        }();
        spn = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return spn__0.call(this);
            case 1:
              return spn__1.call(this, x);
            case 2:
              return spn__2.call(this, x, y);
            case 3:
              return spn__3.call(this, x, y, z);
            default:
              return spn__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
          }
          throw"Invalid arity: " + arguments.length;
        };
        spn.cljs$lang$maxFixedArity = 3;
        spn.cljs$lang$applyTo = spn__4.cljs$lang$applyTo;
        spn.cljs$lang$arity$0 = spn__0;
        spn.cljs$lang$arity$1 = spn__1;
        spn.cljs$lang$arity$2 = spn__2;
        spn.cljs$lang$arity$3 = spn__3;
        spn.cljs$lang$arity$variadic = spn__4.cljs$lang$arity$variadic;
        return spn
      }()
    };
    var G__8570 = function(p1, p2, p3, var_args) {
      var ps = null;
      if(goog.isDef(var_args)) {
        ps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__8570__delegate.call(this, p1, p2, p3, ps)
    };
    G__8570.cljs$lang$maxFixedArity = 3;
    G__8570.cljs$lang$applyTo = function(arglist__8573) {
      var p1 = cljs.core.first(arglist__8573);
      var p2 = cljs.core.first(cljs.core.next(arglist__8573));
      var p3 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8573)));
      var ps = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8573)));
      return G__8570__delegate(p1, p2, p3, ps)
    };
    G__8570.cljs$lang$arity$variadic = G__8570__delegate;
    return G__8570
  }();
  some_fn = function(p1, p2, p3, var_args) {
    var ps = var_args;
    switch(arguments.length) {
      case 1:
        return some_fn__1.call(this, p1);
      case 2:
        return some_fn__2.call(this, p1, p2);
      case 3:
        return some_fn__3.call(this, p1, p2, p3);
      default:
        return some_fn__4.cljs$lang$arity$variadic(p1, p2, p3, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  some_fn.cljs$lang$maxFixedArity = 3;
  some_fn.cljs$lang$applyTo = some_fn__4.cljs$lang$applyTo;
  some_fn.cljs$lang$arity$1 = some_fn__1;
  some_fn.cljs$lang$arity$2 = some_fn__2;
  some_fn.cljs$lang$arity$3 = some_fn__3;
  some_fn.cljs$lang$arity$variadic = some_fn__4.cljs$lang$arity$variadic;
  return some_fn
}();
cljs.core.map = function() {
  var map = null;
  var map__2 = function(f, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____8592 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____8592) {
        var s__8593 = temp__3974__auto____8592;
        if(cljs.core.chunked_seq_QMARK_.call(null, s__8593)) {
          var c__8594 = cljs.core.chunk_first.call(null, s__8593);
          var size__8595 = cljs.core.count.call(null, c__8594);
          var b__8596 = cljs.core.chunk_buffer.call(null, size__8595);
          var n__2523__auto____8597 = size__8595;
          var i__8598 = 0;
          while(true) {
            if(i__8598 < n__2523__auto____8597) {
              cljs.core.chunk_append.call(null, b__8596, f.call(null, cljs.core._nth.call(null, c__8594, i__8598)));
              var G__8610 = i__8598 + 1;
              i__8598 = G__8610;
              continue
            }else {
            }
            break
          }
          return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b__8596), map.call(null, f, cljs.core.chunk_rest.call(null, s__8593)))
        }else {
          return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s__8593)), map.call(null, f, cljs.core.rest.call(null, s__8593)))
        }
      }else {
        return null
      }
    }, null)
  };
  var map__3 = function(f, c1, c2) {
    return new cljs.core.LazySeq(null, false, function() {
      var s1__8599 = cljs.core.seq.call(null, c1);
      var s2__8600 = cljs.core.seq.call(null, c2);
      if(function() {
        var and__3822__auto____8601 = s1__8599;
        if(and__3822__auto____8601) {
          return s2__8600
        }else {
          return and__3822__auto____8601
        }
      }()) {
        return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s1__8599), cljs.core.first.call(null, s2__8600)), map.call(null, f, cljs.core.rest.call(null, s1__8599), cljs.core.rest.call(null, s2__8600)))
      }else {
        return null
      }
    }, null)
  };
  var map__4 = function(f, c1, c2, c3) {
    return new cljs.core.LazySeq(null, false, function() {
      var s1__8602 = cljs.core.seq.call(null, c1);
      var s2__8603 = cljs.core.seq.call(null, c2);
      var s3__8604 = cljs.core.seq.call(null, c3);
      if(function() {
        var and__3822__auto____8605 = s1__8602;
        if(and__3822__auto____8605) {
          var and__3822__auto____8606 = s2__8603;
          if(and__3822__auto____8606) {
            return s3__8604
          }else {
            return and__3822__auto____8606
          }
        }else {
          return and__3822__auto____8605
        }
      }()) {
        return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s1__8602), cljs.core.first.call(null, s2__8603), cljs.core.first.call(null, s3__8604)), map.call(null, f, cljs.core.rest.call(null, s1__8602), cljs.core.rest.call(null, s2__8603), cljs.core.rest.call(null, s3__8604)))
      }else {
        return null
      }
    }, null)
  };
  var map__5 = function() {
    var G__8611__delegate = function(f, c1, c2, c3, colls) {
      var step__8609 = function step(cs) {
        return new cljs.core.LazySeq(null, false, function() {
          var ss__8608 = map.call(null, cljs.core.seq, cs);
          if(cljs.core.every_QMARK_.call(null, cljs.core.identity, ss__8608)) {
            return cljs.core.cons.call(null, map.call(null, cljs.core.first, ss__8608), step.call(null, map.call(null, cljs.core.rest, ss__8608)))
          }else {
            return null
          }
        }, null)
      };
      return map.call(null, function(p1__8413_SHARP_) {
        return cljs.core.apply.call(null, f, p1__8413_SHARP_)
      }, step__8609.call(null, cljs.core.conj.call(null, colls, c3, c2, c1)))
    };
    var G__8611 = function(f, c1, c2, c3, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__8611__delegate.call(this, f, c1, c2, c3, colls)
    };
    G__8611.cljs$lang$maxFixedArity = 4;
    G__8611.cljs$lang$applyTo = function(arglist__8612) {
      var f = cljs.core.first(arglist__8612);
      var c1 = cljs.core.first(cljs.core.next(arglist__8612));
      var c2 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8612)));
      var c3 = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__8612))));
      var colls = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__8612))));
      return G__8611__delegate(f, c1, c2, c3, colls)
    };
    G__8611.cljs$lang$arity$variadic = G__8611__delegate;
    return G__8611
  }();
  map = function(f, c1, c2, c3, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return map__2.call(this, f, c1);
      case 3:
        return map__3.call(this, f, c1, c2);
      case 4:
        return map__4.call(this, f, c1, c2, c3);
      default:
        return map__5.cljs$lang$arity$variadic(f, c1, c2, c3, cljs.core.array_seq(arguments, 4))
    }
    throw"Invalid arity: " + arguments.length;
  };
  map.cljs$lang$maxFixedArity = 4;
  map.cljs$lang$applyTo = map__5.cljs$lang$applyTo;
  map.cljs$lang$arity$2 = map__2;
  map.cljs$lang$arity$3 = map__3;
  map.cljs$lang$arity$4 = map__4;
  map.cljs$lang$arity$variadic = map__5.cljs$lang$arity$variadic;
  return map
}();
cljs.core.take = function take(n, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    if(n > 0) {
      var temp__3974__auto____8615 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____8615) {
        var s__8616 = temp__3974__auto____8615;
        return cljs.core.cons.call(null, cljs.core.first.call(null, s__8616), take.call(null, n - 1, cljs.core.rest.call(null, s__8616)))
      }else {
        return null
      }
    }else {
      return null
    }
  }, null)
};
cljs.core.drop = function drop(n, coll) {
  var step__8622 = function(n, coll) {
    while(true) {
      var s__8620 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(function() {
        var and__3822__auto____8621 = n > 0;
        if(and__3822__auto____8621) {
          return s__8620
        }else {
          return and__3822__auto____8621
        }
      }())) {
        var G__8623 = n - 1;
        var G__8624 = cljs.core.rest.call(null, s__8620);
        n = G__8623;
        coll = G__8624;
        continue
      }else {
        return s__8620
      }
      break
    }
  };
  return new cljs.core.LazySeq(null, false, function() {
    return step__8622.call(null, n, coll)
  }, null)
};
cljs.core.drop_last = function() {
  var drop_last = null;
  var drop_last__1 = function(s) {
    return drop_last.call(null, 1, s)
  };
  var drop_last__2 = function(n, s) {
    return cljs.core.map.call(null, function(x, _) {
      return x
    }, s, cljs.core.drop.call(null, n, s))
  };
  drop_last = function(n, s) {
    switch(arguments.length) {
      case 1:
        return drop_last__1.call(this, n);
      case 2:
        return drop_last__2.call(this, n, s)
    }
    throw"Invalid arity: " + arguments.length;
  };
  drop_last.cljs$lang$arity$1 = drop_last__1;
  drop_last.cljs$lang$arity$2 = drop_last__2;
  return drop_last
}();
cljs.core.take_last = function take_last(n, coll) {
  var s__8627 = cljs.core.seq.call(null, coll);
  var lead__8628 = cljs.core.seq.call(null, cljs.core.drop.call(null, n, coll));
  while(true) {
    if(lead__8628) {
      var G__8629 = cljs.core.next.call(null, s__8627);
      var G__8630 = cljs.core.next.call(null, lead__8628);
      s__8627 = G__8629;
      lead__8628 = G__8630;
      continue
    }else {
      return s__8627
    }
    break
  }
};
cljs.core.drop_while = function drop_while(pred, coll) {
  var step__8636 = function(pred, coll) {
    while(true) {
      var s__8634 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(function() {
        var and__3822__auto____8635 = s__8634;
        if(and__3822__auto____8635) {
          return pred.call(null, cljs.core.first.call(null, s__8634))
        }else {
          return and__3822__auto____8635
        }
      }())) {
        var G__8637 = pred;
        var G__8638 = cljs.core.rest.call(null, s__8634);
        pred = G__8637;
        coll = G__8638;
        continue
      }else {
        return s__8634
      }
      break
    }
  };
  return new cljs.core.LazySeq(null, false, function() {
    return step__8636.call(null, pred, coll)
  }, null)
};
cljs.core.cycle = function cycle(coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____8641 = cljs.core.seq.call(null, coll);
    if(temp__3974__auto____8641) {
      var s__8642 = temp__3974__auto____8641;
      return cljs.core.concat.call(null, s__8642, cycle.call(null, s__8642))
    }else {
      return null
    }
  }, null)
};
cljs.core.split_at = function split_at(n, coll) {
  return cljs.core.PersistentVector.fromArray([cljs.core.take.call(null, n, coll), cljs.core.drop.call(null, n, coll)], true)
};
cljs.core.repeat = function() {
  var repeat = null;
  var repeat__1 = function(x) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, x, repeat.call(null, x))
    }, null)
  };
  var repeat__2 = function(n, x) {
    return cljs.core.take.call(null, n, repeat.call(null, x))
  };
  repeat = function(n, x) {
    switch(arguments.length) {
      case 1:
        return repeat__1.call(this, n);
      case 2:
        return repeat__2.call(this, n, x)
    }
    throw"Invalid arity: " + arguments.length;
  };
  repeat.cljs$lang$arity$1 = repeat__1;
  repeat.cljs$lang$arity$2 = repeat__2;
  return repeat
}();
cljs.core.replicate = function replicate(n, x) {
  return cljs.core.take.call(null, n, cljs.core.repeat.call(null, x))
};
cljs.core.repeatedly = function() {
  var repeatedly = null;
  var repeatedly__1 = function(f) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, f.call(null), repeatedly.call(null, f))
    }, null)
  };
  var repeatedly__2 = function(n, f) {
    return cljs.core.take.call(null, n, repeatedly.call(null, f))
  };
  repeatedly = function(n, f) {
    switch(arguments.length) {
      case 1:
        return repeatedly__1.call(this, n);
      case 2:
        return repeatedly__2.call(this, n, f)
    }
    throw"Invalid arity: " + arguments.length;
  };
  repeatedly.cljs$lang$arity$1 = repeatedly__1;
  repeatedly.cljs$lang$arity$2 = repeatedly__2;
  return repeatedly
}();
cljs.core.iterate = function iterate(f, x) {
  return cljs.core.cons.call(null, x, new cljs.core.LazySeq(null, false, function() {
    return iterate.call(null, f, f.call(null, x))
  }, null))
};
cljs.core.interleave = function() {
  var interleave = null;
  var interleave__2 = function(c1, c2) {
    return new cljs.core.LazySeq(null, false, function() {
      var s1__8647 = cljs.core.seq.call(null, c1);
      var s2__8648 = cljs.core.seq.call(null, c2);
      if(function() {
        var and__3822__auto____8649 = s1__8647;
        if(and__3822__auto____8649) {
          return s2__8648
        }else {
          return and__3822__auto____8649
        }
      }()) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, s1__8647), cljs.core.cons.call(null, cljs.core.first.call(null, s2__8648), interleave.call(null, cljs.core.rest.call(null, s1__8647), cljs.core.rest.call(null, s2__8648))))
      }else {
        return null
      }
    }, null)
  };
  var interleave__3 = function() {
    var G__8651__delegate = function(c1, c2, colls) {
      return new cljs.core.LazySeq(null, false, function() {
        var ss__8650 = cljs.core.map.call(null, cljs.core.seq, cljs.core.conj.call(null, colls, c2, c1));
        if(cljs.core.every_QMARK_.call(null, cljs.core.identity, ss__8650)) {
          return cljs.core.concat.call(null, cljs.core.map.call(null, cljs.core.first, ss__8650), cljs.core.apply.call(null, interleave, cljs.core.map.call(null, cljs.core.rest, ss__8650)))
        }else {
          return null
        }
      }, null)
    };
    var G__8651 = function(c1, c2, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__8651__delegate.call(this, c1, c2, colls)
    };
    G__8651.cljs$lang$maxFixedArity = 2;
    G__8651.cljs$lang$applyTo = function(arglist__8652) {
      var c1 = cljs.core.first(arglist__8652);
      var c2 = cljs.core.first(cljs.core.next(arglist__8652));
      var colls = cljs.core.rest(cljs.core.next(arglist__8652));
      return G__8651__delegate(c1, c2, colls)
    };
    G__8651.cljs$lang$arity$variadic = G__8651__delegate;
    return G__8651
  }();
  interleave = function(c1, c2, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return interleave__2.call(this, c1, c2);
      default:
        return interleave__3.cljs$lang$arity$variadic(c1, c2, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  interleave.cljs$lang$maxFixedArity = 2;
  interleave.cljs$lang$applyTo = interleave__3.cljs$lang$applyTo;
  interleave.cljs$lang$arity$2 = interleave__2;
  interleave.cljs$lang$arity$variadic = interleave__3.cljs$lang$arity$variadic;
  return interleave
}();
cljs.core.interpose = function interpose(sep, coll) {
  return cljs.core.drop.call(null, 1, cljs.core.interleave.call(null, cljs.core.repeat.call(null, sep), coll))
};
cljs.core.flatten1 = function flatten1(colls) {
  var cat__8662 = function cat(coll, colls) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3971__auto____8660 = cljs.core.seq.call(null, coll);
      if(temp__3971__auto____8660) {
        var coll__8661 = temp__3971__auto____8660;
        return cljs.core.cons.call(null, cljs.core.first.call(null, coll__8661), cat.call(null, cljs.core.rest.call(null, coll__8661), colls))
      }else {
        if(cljs.core.seq.call(null, colls)) {
          return cat.call(null, cljs.core.first.call(null, colls), cljs.core.rest.call(null, colls))
        }else {
          return null
        }
      }
    }, null)
  };
  return cat__8662.call(null, null, colls)
};
cljs.core.mapcat = function() {
  var mapcat = null;
  var mapcat__2 = function(f, coll) {
    return cljs.core.flatten1.call(null, cljs.core.map.call(null, f, coll))
  };
  var mapcat__3 = function() {
    var G__8663__delegate = function(f, coll, colls) {
      return cljs.core.flatten1.call(null, cljs.core.apply.call(null, cljs.core.map, f, coll, colls))
    };
    var G__8663 = function(f, coll, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__8663__delegate.call(this, f, coll, colls)
    };
    G__8663.cljs$lang$maxFixedArity = 2;
    G__8663.cljs$lang$applyTo = function(arglist__8664) {
      var f = cljs.core.first(arglist__8664);
      var coll = cljs.core.first(cljs.core.next(arglist__8664));
      var colls = cljs.core.rest(cljs.core.next(arglist__8664));
      return G__8663__delegate(f, coll, colls)
    };
    G__8663.cljs$lang$arity$variadic = G__8663__delegate;
    return G__8663
  }();
  mapcat = function(f, coll, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return mapcat__2.call(this, f, coll);
      default:
        return mapcat__3.cljs$lang$arity$variadic(f, coll, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  mapcat.cljs$lang$maxFixedArity = 2;
  mapcat.cljs$lang$applyTo = mapcat__3.cljs$lang$applyTo;
  mapcat.cljs$lang$arity$2 = mapcat__2;
  mapcat.cljs$lang$arity$variadic = mapcat__3.cljs$lang$arity$variadic;
  return mapcat
}();
cljs.core.filter = function filter(pred, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____8674 = cljs.core.seq.call(null, coll);
    if(temp__3974__auto____8674) {
      var s__8675 = temp__3974__auto____8674;
      if(cljs.core.chunked_seq_QMARK_.call(null, s__8675)) {
        var c__8676 = cljs.core.chunk_first.call(null, s__8675);
        var size__8677 = cljs.core.count.call(null, c__8676);
        var b__8678 = cljs.core.chunk_buffer.call(null, size__8677);
        var n__2523__auto____8679 = size__8677;
        var i__8680 = 0;
        while(true) {
          if(i__8680 < n__2523__auto____8679) {
            if(cljs.core.truth_(pred.call(null, cljs.core._nth.call(null, c__8676, i__8680)))) {
              cljs.core.chunk_append.call(null, b__8678, cljs.core._nth.call(null, c__8676, i__8680))
            }else {
            }
            var G__8683 = i__8680 + 1;
            i__8680 = G__8683;
            continue
          }else {
          }
          break
        }
        return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b__8678), filter.call(null, pred, cljs.core.chunk_rest.call(null, s__8675)))
      }else {
        var f__8681 = cljs.core.first.call(null, s__8675);
        var r__8682 = cljs.core.rest.call(null, s__8675);
        if(cljs.core.truth_(pred.call(null, f__8681))) {
          return cljs.core.cons.call(null, f__8681, filter.call(null, pred, r__8682))
        }else {
          return filter.call(null, pred, r__8682)
        }
      }
    }else {
      return null
    }
  }, null)
};
cljs.core.remove = function remove(pred, coll) {
  return cljs.core.filter.call(null, cljs.core.complement.call(null, pred), coll)
};
cljs.core.tree_seq = function tree_seq(branch_QMARK_, children, root) {
  var walk__8686 = function walk(node) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, node, cljs.core.truth_(branch_QMARK_.call(null, node)) ? cljs.core.mapcat.call(null, walk, children.call(null, node)) : null)
    }, null)
  };
  return walk__8686.call(null, root)
};
cljs.core.flatten = function flatten(x) {
  return cljs.core.filter.call(null, function(p1__8684_SHARP_) {
    return!cljs.core.sequential_QMARK_.call(null, p1__8684_SHARP_)
  }, cljs.core.rest.call(null, cljs.core.tree_seq.call(null, cljs.core.sequential_QMARK_, cljs.core.seq, x)))
};
cljs.core.into = function into(to, from) {
  if(function() {
    var G__8690__8691 = to;
    if(G__8690__8691) {
      if(function() {
        var or__3824__auto____8692 = G__8690__8691.cljs$lang$protocol_mask$partition1$ & 1;
        if(or__3824__auto____8692) {
          return or__3824__auto____8692
        }else {
          return G__8690__8691.cljs$core$IEditableCollection$
        }
      }()) {
        return true
      }else {
        if(!G__8690__8691.cljs$lang$protocol_mask$partition1$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.IEditableCollection, G__8690__8691)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IEditableCollection, G__8690__8691)
    }
  }()) {
    return cljs.core.persistent_BANG_.call(null, cljs.core.reduce.call(null, cljs.core._conj_BANG_, cljs.core.transient$.call(null, to), from))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, to, from)
  }
};
cljs.core.mapv = function() {
  var mapv = null;
  var mapv__2 = function(f, coll) {
    return cljs.core.persistent_BANG_.call(null, cljs.core.reduce.call(null, function(v, o) {
      return cljs.core.conj_BANG_.call(null, v, f.call(null, o))
    }, cljs.core.transient$.call(null, cljs.core.PersistentVector.EMPTY), coll))
  };
  var mapv__3 = function(f, c1, c2) {
    return cljs.core.into.call(null, cljs.core.PersistentVector.EMPTY, cljs.core.map.call(null, f, c1, c2))
  };
  var mapv__4 = function(f, c1, c2, c3) {
    return cljs.core.into.call(null, cljs.core.PersistentVector.EMPTY, cljs.core.map.call(null, f, c1, c2, c3))
  };
  var mapv__5 = function() {
    var G__8693__delegate = function(f, c1, c2, c3, colls) {
      return cljs.core.into.call(null, cljs.core.PersistentVector.EMPTY, cljs.core.apply.call(null, cljs.core.map, f, c1, c2, c3, colls))
    };
    var G__8693 = function(f, c1, c2, c3, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__8693__delegate.call(this, f, c1, c2, c3, colls)
    };
    G__8693.cljs$lang$maxFixedArity = 4;
    G__8693.cljs$lang$applyTo = function(arglist__8694) {
      var f = cljs.core.first(arglist__8694);
      var c1 = cljs.core.first(cljs.core.next(arglist__8694));
      var c2 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8694)));
      var c3 = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__8694))));
      var colls = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__8694))));
      return G__8693__delegate(f, c1, c2, c3, colls)
    };
    G__8693.cljs$lang$arity$variadic = G__8693__delegate;
    return G__8693
  }();
  mapv = function(f, c1, c2, c3, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return mapv__2.call(this, f, c1);
      case 3:
        return mapv__3.call(this, f, c1, c2);
      case 4:
        return mapv__4.call(this, f, c1, c2, c3);
      default:
        return mapv__5.cljs$lang$arity$variadic(f, c1, c2, c3, cljs.core.array_seq(arguments, 4))
    }
    throw"Invalid arity: " + arguments.length;
  };
  mapv.cljs$lang$maxFixedArity = 4;
  mapv.cljs$lang$applyTo = mapv__5.cljs$lang$applyTo;
  mapv.cljs$lang$arity$2 = mapv__2;
  mapv.cljs$lang$arity$3 = mapv__3;
  mapv.cljs$lang$arity$4 = mapv__4;
  mapv.cljs$lang$arity$variadic = mapv__5.cljs$lang$arity$variadic;
  return mapv
}();
cljs.core.filterv = function filterv(pred, coll) {
  return cljs.core.persistent_BANG_.call(null, cljs.core.reduce.call(null, function(v, o) {
    if(cljs.core.truth_(pred.call(null, o))) {
      return cljs.core.conj_BANG_.call(null, v, o)
    }else {
      return v
    }
  }, cljs.core.transient$.call(null, cljs.core.PersistentVector.EMPTY), coll))
};
cljs.core.partition = function() {
  var partition = null;
  var partition__2 = function(n, coll) {
    return partition.call(null, n, n, coll)
  };
  var partition__3 = function(n, step, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____8701 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____8701) {
        var s__8702 = temp__3974__auto____8701;
        var p__8703 = cljs.core.take.call(null, n, s__8702);
        if(n === cljs.core.count.call(null, p__8703)) {
          return cljs.core.cons.call(null, p__8703, partition.call(null, n, step, cljs.core.drop.call(null, step, s__8702)))
        }else {
          return null
        }
      }else {
        return null
      }
    }, null)
  };
  var partition__4 = function(n, step, pad, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____8704 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____8704) {
        var s__8705 = temp__3974__auto____8704;
        var p__8706 = cljs.core.take.call(null, n, s__8705);
        if(n === cljs.core.count.call(null, p__8706)) {
          return cljs.core.cons.call(null, p__8706, partition.call(null, n, step, pad, cljs.core.drop.call(null, step, s__8705)))
        }else {
          return cljs.core.list.call(null, cljs.core.take.call(null, n, cljs.core.concat.call(null, p__8706, pad)))
        }
      }else {
        return null
      }
    }, null)
  };
  partition = function(n, step, pad, coll) {
    switch(arguments.length) {
      case 2:
        return partition__2.call(this, n, step);
      case 3:
        return partition__3.call(this, n, step, pad);
      case 4:
        return partition__4.call(this, n, step, pad, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  partition.cljs$lang$arity$2 = partition__2;
  partition.cljs$lang$arity$3 = partition__3;
  partition.cljs$lang$arity$4 = partition__4;
  return partition
}();
cljs.core.get_in = function() {
  var get_in = null;
  var get_in__2 = function(m, ks) {
    return cljs.core.reduce.call(null, cljs.core.get, m, ks)
  };
  var get_in__3 = function(m, ks, not_found) {
    var sentinel__8711 = cljs.core.lookup_sentinel;
    var m__8712 = m;
    var ks__8713 = cljs.core.seq.call(null, ks);
    while(true) {
      if(ks__8713) {
        var m__8714 = cljs.core._lookup.call(null, m__8712, cljs.core.first.call(null, ks__8713), sentinel__8711);
        if(sentinel__8711 === m__8714) {
          return not_found
        }else {
          var G__8715 = sentinel__8711;
          var G__8716 = m__8714;
          var G__8717 = cljs.core.next.call(null, ks__8713);
          sentinel__8711 = G__8715;
          m__8712 = G__8716;
          ks__8713 = G__8717;
          continue
        }
      }else {
        return m__8712
      }
      break
    }
  };
  get_in = function(m, ks, not_found) {
    switch(arguments.length) {
      case 2:
        return get_in__2.call(this, m, ks);
      case 3:
        return get_in__3.call(this, m, ks, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  get_in.cljs$lang$arity$2 = get_in__2;
  get_in.cljs$lang$arity$3 = get_in__3;
  return get_in
}();
cljs.core.assoc_in = function assoc_in(m, p__8718, v) {
  var vec__8723__8724 = p__8718;
  var k__8725 = cljs.core.nth.call(null, vec__8723__8724, 0, null);
  var ks__8726 = cljs.core.nthnext.call(null, vec__8723__8724, 1);
  if(cljs.core.truth_(ks__8726)) {
    return cljs.core.assoc.call(null, m, k__8725, assoc_in.call(null, cljs.core._lookup.call(null, m, k__8725, null), ks__8726, v))
  }else {
    return cljs.core.assoc.call(null, m, k__8725, v)
  }
};
cljs.core.update_in = function() {
  var update_in__delegate = function(m, p__8727, f, args) {
    var vec__8732__8733 = p__8727;
    var k__8734 = cljs.core.nth.call(null, vec__8732__8733, 0, null);
    var ks__8735 = cljs.core.nthnext.call(null, vec__8732__8733, 1);
    if(cljs.core.truth_(ks__8735)) {
      return cljs.core.assoc.call(null, m, k__8734, cljs.core.apply.call(null, update_in, cljs.core._lookup.call(null, m, k__8734, null), ks__8735, f, args))
    }else {
      return cljs.core.assoc.call(null, m, k__8734, cljs.core.apply.call(null, f, cljs.core._lookup.call(null, m, k__8734, null), args))
    }
  };
  var update_in = function(m, p__8727, f, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
    }
    return update_in__delegate.call(this, m, p__8727, f, args)
  };
  update_in.cljs$lang$maxFixedArity = 3;
  update_in.cljs$lang$applyTo = function(arglist__8736) {
    var m = cljs.core.first(arglist__8736);
    var p__8727 = cljs.core.first(cljs.core.next(arglist__8736));
    var f = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8736)));
    var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8736)));
    return update_in__delegate(m, p__8727, f, args)
  };
  update_in.cljs$lang$arity$variadic = update_in__delegate;
  return update_in
}();
cljs.core.Vector = function(meta, array, __hash) {
  this.meta = meta;
  this.array = array;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32400159
};
cljs.core.Vector.cljs$lang$type = true;
cljs.core.Vector.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/Vector")
};
cljs.core.Vector.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__8739 = this;
  var h__2188__auto____8740 = this__8739.__hash;
  if(!(h__2188__auto____8740 == null)) {
    return h__2188__auto____8740
  }else {
    var h__2188__auto____8741 = cljs.core.hash_coll.call(null, coll);
    this__8739.__hash = h__2188__auto____8741;
    return h__2188__auto____8741
  }
};
cljs.core.Vector.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__8742 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, null)
};
cljs.core.Vector.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__8743 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, not_found)
};
cljs.core.Vector.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__8744 = this;
  var new_array__8745 = this__8744.array.slice();
  new_array__8745[k] = v;
  return new cljs.core.Vector(this__8744.meta, new_array__8745, null)
};
cljs.core.Vector.prototype.call = function() {
  var G__8776 = null;
  var G__8776__2 = function(this_sym8746, k) {
    var this__8748 = this;
    var this_sym8746__8749 = this;
    var coll__8750 = this_sym8746__8749;
    return coll__8750.cljs$core$ILookup$_lookup$arity$2(coll__8750, k)
  };
  var G__8776__3 = function(this_sym8747, k, not_found) {
    var this__8748 = this;
    var this_sym8747__8751 = this;
    var coll__8752 = this_sym8747__8751;
    return coll__8752.cljs$core$ILookup$_lookup$arity$3(coll__8752, k, not_found)
  };
  G__8776 = function(this_sym8747, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__8776__2.call(this, this_sym8747, k);
      case 3:
        return G__8776__3.call(this, this_sym8747, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__8776
}();
cljs.core.Vector.prototype.apply = function(this_sym8737, args8738) {
  var this__8753 = this;
  return this_sym8737.call.apply(this_sym8737, [this_sym8737].concat(args8738.slice()))
};
cljs.core.Vector.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__8754 = this;
  var new_array__8755 = this__8754.array.slice();
  new_array__8755.push(o);
  return new cljs.core.Vector(this__8754.meta, new_array__8755, null)
};
cljs.core.Vector.prototype.toString = function() {
  var this__8756 = this;
  var this__8757 = this;
  return cljs.core.pr_str.call(null, this__8757)
};
cljs.core.Vector.prototype.cljs$core$IReduce$_reduce$arity$2 = function(v, f) {
  var this__8758 = this;
  return cljs.core.ci_reduce.call(null, this__8758.array, f)
};
cljs.core.Vector.prototype.cljs$core$IReduce$_reduce$arity$3 = function(v, f, start) {
  var this__8759 = this;
  return cljs.core.ci_reduce.call(null, this__8759.array, f, start)
};
cljs.core.Vector.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__8760 = this;
  if(this__8760.array.length > 0) {
    var vector_seq__8761 = function vector_seq(i) {
      return new cljs.core.LazySeq(null, false, function() {
        if(i < this__8760.array.length) {
          return cljs.core.cons.call(null, this__8760.array[i], vector_seq.call(null, i + 1))
        }else {
          return null
        }
      }, null)
    };
    return vector_seq__8761.call(null, 0)
  }else {
    return null
  }
};
cljs.core.Vector.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__8762 = this;
  return this__8762.array.length
};
cljs.core.Vector.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__8763 = this;
  var count__8764 = this__8763.array.length;
  if(count__8764 > 0) {
    return this__8763.array[count__8764 - 1]
  }else {
    return null
  }
};
cljs.core.Vector.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__8765 = this;
  if(this__8765.array.length > 0) {
    var new_array__8766 = this__8765.array.slice();
    new_array__8766.pop();
    return new cljs.core.Vector(this__8765.meta, new_array__8766, null)
  }else {
    throw new Error("Can't pop empty vector");
  }
};
cljs.core.Vector.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(coll, n, val) {
  var this__8767 = this;
  return coll.cljs$core$IAssociative$_assoc$arity$3(coll, n, val)
};
cljs.core.Vector.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__8768 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.Vector.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__8769 = this;
  return new cljs.core.Vector(meta, this__8769.array, this__8769.__hash)
};
cljs.core.Vector.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__8770 = this;
  return this__8770.meta
};
cljs.core.Vector.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__8771 = this;
  if(function() {
    var and__3822__auto____8772 = 0 <= n;
    if(and__3822__auto____8772) {
      return n < this__8771.array.length
    }else {
      return and__3822__auto____8772
    }
  }()) {
    return this__8771.array[n]
  }else {
    return null
  }
};
cljs.core.Vector.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__8773 = this;
  if(function() {
    var and__3822__auto____8774 = 0 <= n;
    if(and__3822__auto____8774) {
      return n < this__8773.array.length
    }else {
      return and__3822__auto____8774
    }
  }()) {
    return this__8773.array[n]
  }else {
    return not_found
  }
};
cljs.core.Vector.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__8775 = this;
  return cljs.core.with_meta.call(null, cljs.core.Vector.EMPTY, this__8775.meta)
};
cljs.core.Vector;
cljs.core.Vector.EMPTY = new cljs.core.Vector(null, [], 0);
cljs.core.Vector.fromArray = function(xs) {
  return new cljs.core.Vector(null, xs, null)
};
cljs.core.VectorNode = function(edit, arr) {
  this.edit = edit;
  this.arr = arr
};
cljs.core.VectorNode.cljs$lang$type = true;
cljs.core.VectorNode.cljs$lang$ctorPrSeq = function(this__2306__auto__) {
  return cljs.core.list.call(null, "cljs.core/VectorNode")
};
cljs.core.VectorNode;
cljs.core.pv_fresh_node = function pv_fresh_node(edit) {
  return new cljs.core.VectorNode(edit, cljs.core.make_array.call(null, 32))
};
cljs.core.pv_aget = function pv_aget(node, idx) {
  return node.arr[idx]
};
cljs.core.pv_aset = function pv_aset(node, idx, val) {
  return node.arr[idx] = val
};
cljs.core.pv_clone_node = function pv_clone_node(node) {
  return new cljs.core.VectorNode(node.edit, node.arr.slice())
};
cljs.core.tail_off = function tail_off(pv) {
  var cnt__8778 = pv.cnt;
  if(cnt__8778 < 32) {
    return 0
  }else {
    return cnt__8778 - 1 >>> 5 << 5
  }
};
cljs.core.new_path = function new_path(edit, level, node) {
  var ll__8784 = level;
  var ret__8785 = node;
  while(true) {
    if(ll__8784 === 0) {
      return ret__8785
    }else {
      var embed__8786 = ret__8785;
      var r__8787 = cljs.core.pv_fresh_node.call(null, edit);
      var ___8788 = cljs.core.pv_aset.call(null, r__8787, 0, embed__8786);
      var G__8789 = ll__8784 - 5;
      var G__8790 = r__8787;
      ll__8784 = G__8789;
      ret__8785 = G__8790;
      continue
    }
    break
  }
};
cljs.core.push_tail = function push_tail(pv, level, parent, tailnode) {
  var ret__8796 = cljs.core.pv_clone_node.call(null, parent);
  var subidx__8797 = pv.cnt - 1 >>> level & 31;
  if(5 === level) {
    cljs.core.pv_aset.call(null, ret__8796, subidx__8797, tailnode);
    return ret__8796
  }else {
    var child__8798 = cljs.core.pv_aget.call(null, parent, subidx__8797);
    if(!(child__8798 == null)) {
      var node_to_insert__8799 = push_tail.call(null, pv, level - 5, child__8798, tailnode);
      cljs.core.pv_aset.call(null, ret__8796, subidx__8797, node_to_insert__8799);
      return ret__8796
    }else {
      var node_to_insert__8800 = cljs.core.new_path.call(null, null, level - 5, tailnode);
      cljs.core.pv_aset.call(null, ret__8796, subidx__8797, node_to_insert__8800);
      return ret__8796
    }
  }
};
cljs.core.array_for = function array_for(pv, i) {
  if(function() {
    var and__3822__auto____8804 = 0 <= i;
    if(and__3822__auto____8804) {
      return i < pv.cnt
    }else {
      return and__3822__auto____8804
    }
  }()) {
    if(i >= cljs.core.tail_off.call(null, pv)) {
      return pv.tail
    }else {
      var node__8805 = pv.root;
      var level__8806 = pv.shift;
      while(true) {
        if(level__8806 > 0) {
          var G__8807 = cljs.core.pv_aget.call(null, node__8805, i >>> level__8806 & 31);
          var G__8808 = level__8806 - 5;
          node__8805 = G__8807;
          level__8806 = G__8808;
          continue
        }else {
          return node__8805.arr
        }
        break
      }
    }
  }else {
    throw new Error([cljs.core.str("No item "), cljs.core.str(i), cljs.core.str(" in vector of length "), cljs.core.str(pv.cnt)].join(""));
  }
};
cljs.core.do_assoc = function do_assoc(pv, level, node, i, val) {
  var ret__8811 = cljs.core.pv_clone_node.call(null, node);
  if(level === 0) {
    cljs.core.pv_aset.call(null, ret__8811, i & 31, val);
    return ret__8811
  }else {
    var subidx__8812 = i >>> level & 31;
    cljs.core.pv_aset.call(null, ret__8811, subidx__8812, do_assoc.call(null, pv, level - 5, cljs.core.pv_aget.call(null, node, subidx__8812), i, val));
    return ret__8811
  }
};
cljs.core.pop_tail = function pop_tail(pv, level, node) {
  var subidx__8818 = pv.cnt - 2 >>> level & 31;
  if(level > 5) {
    var new_child__8819 = pop_tail.call(null, pv, level - 5, cljs.core.pv_aget.call(null, node, subidx__8818));
    if(function() {
      var and__3822__auto____8820 = new_child__8819 == null;
      if(and__3822__auto____8820) {
        return subidx__8818 === 0
      }else {
        return and__3822__auto____8820
      }
    }()) {
      return null
    }else {
      var ret__8821 = cljs.core.pv_clone_node.call(null, node);
      cljs.core.pv_aset.call(null, ret__8821, subidx__8818, new_child__8819);
      return ret__8821
    }
  }else {
    if(subidx__8818 === 0) {
      return null
    }else {
      if("\ufdd0'else") {
        var ret__8822 = cljs.core.pv_clone_node.call(null, node);
        cljs.core.pv_aset.call(null, ret__8822, subidx__8818, null);
        return ret__8822
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentVector = function(meta, cnt, shift, root, tail, __hash) {
  this.meta = meta;
  this.cnt = cnt;
  this.shift = shift;
  this.root = root;
  this.tail = tail;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 1;
  this.cljs$lang$protocol_mask$partition0$ = 167668511
};
cljs.core.PersistentVector.cljs$lang$type = true;
cljs.core.PersistentVector.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentVector")
};
cljs.core.PersistentVector.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var this__8825 = this;
  return new cljs.core.TransientVector(this__8825.cnt, this__8825.shift, cljs.core.tv_editable_root.call(null, this__8825.root), cljs.core.tv_editable_tail.call(null, this__8825.tail))
};
cljs.core.PersistentVector.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__8826 = this;
  var h__2188__auto____8827 = this__8826.__hash;
  if(!(h__2188__auto____8827 == null)) {
    return h__2188__auto____8827
  }else {
    var h__2188__auto____8828 = cljs.core.hash_coll.call(null, coll);
    this__8826.__hash = h__2188__auto____8828;
    return h__2188__auto____8828
  }
};
cljs.core.PersistentVector.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__8829 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, null)
};
cljs.core.PersistentVector.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__8830 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, not_found)
};
cljs.core.PersistentVector.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__8831 = this;
  if(function() {
    var and__3822__auto____8832 = 0 <= k;
    if(and__3822__auto____8832) {
      return k < this__8831.cnt
    }else {
      return and__3822__auto____8832
    }
  }()) {
    if(cljs.core.tail_off.call(null, coll) <= k) {
      var new_tail__8833 = this__8831.tail.slice();
      new_tail__8833[k & 31] = v;
      return new cljs.core.PersistentVector(this__8831.meta, this__8831.cnt, this__8831.shift, this__8831.root, new_tail__8833, null)
    }else {
      return new cljs.core.PersistentVector(this__8831.meta, this__8831.cnt, this__8831.shift, cljs.core.do_assoc.call(null, coll, this__8831.shift, this__8831.root, k, v), this__8831.tail, null)
    }
  }else {
    if(k === this__8831.cnt) {
      return coll.cljs$core$ICollection$_conj$arity$2(coll, v)
    }else {
      if("\ufdd0'else") {
        throw new Error([cljs.core.str("Index "), cljs.core.str(k), cljs.core.str(" out of bounds  [0,"), cljs.core.str(this__8831.cnt), cljs.core.str("]")].join(""));
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentVector.prototype.call = function() {
  var G__8881 = null;
  var G__8881__2 = function(this_sym8834, k) {
    var this__8836 = this;
    var this_sym8834__8837 = this;
    var coll__8838 = this_sym8834__8837;
    return coll__8838.cljs$core$ILookup$_lookup$arity$2(coll__8838, k)
  };
  var G__8881__3 = function(this_sym8835, k, not_found) {
    var this__8836 = this;
    var this_sym8835__8839 = this;
    var coll__8840 = this_sym8835__8839;
    return coll__8840.cljs$core$ILookup$_lookup$arity$3(coll__8840, k, not_found)
  };
  G__8881 = function(this_sym8835, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__8881__2.call(this, this_sym8835, k);
      case 3:
        return G__8881__3.call(this, this_sym8835, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__8881
}();
cljs.core.PersistentVector.prototype.apply = function(this_sym8823, args8824) {
  var this__8841 = this;
  return this_sym8823.call.apply(this_sym8823, [this_sym8823].concat(args8824.slice()))
};
cljs.core.PersistentVector.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = function(v, f, init) {
  var this__8842 = this;
  var step_init__8843 = [0, init];
  var i__8844 = 0;
  while(true) {
    if(i__8844 < this__8842.cnt) {
      var arr__8845 = cljs.core.array_for.call(null, v, i__8844);
      var len__8846 = arr__8845.length;
      var init__8850 = function() {
        var j__8847 = 0;
        var init__8848 = step_init__8843[1];
        while(true) {
          if(j__8847 < len__8846) {
            var init__8849 = f.call(null, init__8848, j__8847 + i__8844, arr__8845[j__8847]);
            if(cljs.core.reduced_QMARK_.call(null, init__8849)) {
              return init__8849
            }else {
              var G__8882 = j__8847 + 1;
              var G__8883 = init__8849;
              j__8847 = G__8882;
              init__8848 = G__8883;
              continue
            }
          }else {
            step_init__8843[0] = len__8846;
            step_init__8843[1] = init__8848;
            return init__8848
          }
          break
        }
      }();
      if(cljs.core.reduced_QMARK_.call(null, init__8850)) {
        return cljs.core.deref.call(null, init__8850)
      }else {
        var G__8884 = i__8844 + step_init__8843[0];
        i__8844 = G__8884;
        continue
      }
    }else {
      return step_init__8843[1]
    }
    break
  }
};
cljs.core.PersistentVector.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__8851 = this;
  if(this__8851.cnt - cljs.core.tail_off.call(null, coll) < 32) {
    var new_tail__8852 = this__8851.tail.slice();
    new_tail__8852.push(o);
    return new cljs.core.PersistentVector(this__8851.meta, this__8851.cnt + 1, this__8851.shift, this__8851.root, new_tail__8852, null)
  }else {
    var root_overflow_QMARK___8853 = this__8851.cnt >>> 5 > 1 << this__8851.shift;
    var new_shift__8854 = root_overflow_QMARK___8853 ? this__8851.shift + 5 : this__8851.shift;
    var new_root__8856 = root_overflow_QMARK___8853 ? function() {
      var n_r__8855 = cljs.core.pv_fresh_node.call(null, null);
      cljs.core.pv_aset.call(null, n_r__8855, 0, this__8851.root);
      cljs.core.pv_aset.call(null, n_r__8855, 1, cljs.core.new_path.call(null, null, this__8851.shift, new cljs.core.VectorNode(null, this__8851.tail)));
      return n_r__8855
    }() : cljs.core.push_tail.call(null, coll, this__8851.shift, this__8851.root, new cljs.core.VectorNode(null, this__8851.tail));
    return new cljs.core.PersistentVector(this__8851.meta, this__8851.cnt + 1, new_shift__8854, new_root__8856, [o], null)
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var this__8857 = this;
  if(this__8857.cnt > 0) {
    return new cljs.core.RSeq(coll, this__8857.cnt - 1, null)
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IMapEntry$_key$arity$1 = function(coll) {
  var this__8858 = this;
  return coll.cljs$core$IIndexed$_nth$arity$2(coll, 0)
};
cljs.core.PersistentVector.prototype.cljs$core$IMapEntry$_val$arity$1 = function(coll) {
  var this__8859 = this;
  return coll.cljs$core$IIndexed$_nth$arity$2(coll, 1)
};
cljs.core.PersistentVector.prototype.toString = function() {
  var this__8860 = this;
  var this__8861 = this;
  return cljs.core.pr_str.call(null, this__8861)
};
cljs.core.PersistentVector.prototype.cljs$core$IReduce$_reduce$arity$2 = function(v, f) {
  var this__8862 = this;
  return cljs.core.ci_reduce.call(null, v, f)
};
cljs.core.PersistentVector.prototype.cljs$core$IReduce$_reduce$arity$3 = function(v, f, start) {
  var this__8863 = this;
  return cljs.core.ci_reduce.call(null, v, f, start)
};
cljs.core.PersistentVector.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__8864 = this;
  if(this__8864.cnt === 0) {
    return null
  }else {
    return cljs.core.chunked_seq.call(null, coll, 0, 0)
  }
};
cljs.core.PersistentVector.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__8865 = this;
  return this__8865.cnt
};
cljs.core.PersistentVector.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__8866 = this;
  if(this__8866.cnt > 0) {
    return coll.cljs$core$IIndexed$_nth$arity$2(coll, this__8866.cnt - 1)
  }else {
    return null
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__8867 = this;
  if(this__8867.cnt === 0) {
    throw new Error("Can't pop empty vector");
  }else {
    if(1 === this__8867.cnt) {
      return cljs.core._with_meta.call(null, cljs.core.PersistentVector.EMPTY, this__8867.meta)
    }else {
      if(1 < this__8867.cnt - cljs.core.tail_off.call(null, coll)) {
        return new cljs.core.PersistentVector(this__8867.meta, this__8867.cnt - 1, this__8867.shift, this__8867.root, this__8867.tail.slice(0, -1), null)
      }else {
        if("\ufdd0'else") {
          var new_tail__8868 = cljs.core.array_for.call(null, coll, this__8867.cnt - 2);
          var nr__8869 = cljs.core.pop_tail.call(null, coll, this__8867.shift, this__8867.root);
          var new_root__8870 = nr__8869 == null ? cljs.core.PersistentVector.EMPTY_NODE : nr__8869;
          var cnt_1__8871 = this__8867.cnt - 1;
          if(function() {
            var and__3822__auto____8872 = 5 < this__8867.shift;
            if(and__3822__auto____8872) {
              return cljs.core.pv_aget.call(null, new_root__8870, 1) == null
            }else {
              return and__3822__auto____8872
            }
          }()) {
            return new cljs.core.PersistentVector(this__8867.meta, cnt_1__8871, this__8867.shift - 5, cljs.core.pv_aget.call(null, new_root__8870, 0), new_tail__8868, null)
          }else {
            return new cljs.core.PersistentVector(this__8867.meta, cnt_1__8871, this__8867.shift, new_root__8870, new_tail__8868, null)
          }
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(coll, n, val) {
  var this__8873 = this;
  return coll.cljs$core$IAssociative$_assoc$arity$3(coll, n, val)
};
cljs.core.PersistentVector.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__8874 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentVector.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__8875 = this;
  return new cljs.core.PersistentVector(meta, this__8875.cnt, this__8875.shift, this__8875.root, this__8875.tail, this__8875.__hash)
};
cljs.core.PersistentVector.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__8876 = this;
  return this__8876.meta
};
cljs.core.PersistentVector.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__8877 = this;
  return cljs.core.array_for.call(null, coll, n)[n & 31]
};
cljs.core.PersistentVector.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__8878 = this;
  if(function() {
    var and__3822__auto____8879 = 0 <= n;
    if(and__3822__auto____8879) {
      return n < this__8878.cnt
    }else {
      return and__3822__auto____8879
    }
  }()) {
    return coll.cljs$core$IIndexed$_nth$arity$2(coll, n)
  }else {
    return not_found
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__8880 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.EMPTY, this__8880.meta)
};
cljs.core.PersistentVector;
cljs.core.PersistentVector.EMPTY_NODE = cljs.core.pv_fresh_node.call(null, null);
cljs.core.PersistentVector.EMPTY = new cljs.core.PersistentVector(null, 0, 5, cljs.core.PersistentVector.EMPTY_NODE, [], 0);
cljs.core.PersistentVector.fromArray = function(xs, no_clone) {
  var l__8885 = xs.length;
  var xs__8886 = no_clone === true ? xs : xs.slice();
  if(l__8885 < 32) {
    return new cljs.core.PersistentVector(null, l__8885, 5, cljs.core.PersistentVector.EMPTY_NODE, xs__8886, null)
  }else {
    var node__8887 = xs__8886.slice(0, 32);
    var v__8888 = new cljs.core.PersistentVector(null, 32, 5, cljs.core.PersistentVector.EMPTY_NODE, node__8887, null);
    var i__8889 = 32;
    var out__8890 = cljs.core._as_transient.call(null, v__8888);
    while(true) {
      if(i__8889 < l__8885) {
        var G__8891 = i__8889 + 1;
        var G__8892 = cljs.core.conj_BANG_.call(null, out__8890, xs__8886[i__8889]);
        i__8889 = G__8891;
        out__8890 = G__8892;
        continue
      }else {
        return cljs.core.persistent_BANG_.call(null, out__8890)
      }
      break
    }
  }
};
cljs.core.vec = function vec(coll) {
  return cljs.core._persistent_BANG_.call(null, cljs.core.reduce.call(null, cljs.core._conj_BANG_, cljs.core._as_transient.call(null, cljs.core.PersistentVector.EMPTY), coll))
};
cljs.core.vector = function() {
  var vector__delegate = function(args) {
    return cljs.core.vec.call(null, args)
  };
  var vector = function(var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return vector__delegate.call(this, args)
  };
  vector.cljs$lang$maxFixedArity = 0;
  vector.cljs$lang$applyTo = function(arglist__8893) {
    var args = cljs.core.seq(arglist__8893);
    return vector__delegate(args)
  };
  vector.cljs$lang$arity$variadic = vector__delegate;
  return vector
}();
cljs.core.ChunkedSeq = function(vec, node, i, off, meta) {
  this.vec = vec;
  this.node = node;
  this.i = i;
  this.off = off;
  this.meta = meta;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 27525356
};
cljs.core.ChunkedSeq.cljs$lang$type = true;
cljs.core.ChunkedSeq.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/ChunkedSeq")
};
cljs.core.ChunkedSeq.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var this__8894 = this;
  if(this__8894.off + 1 < this__8894.node.length) {
    var s__8895 = cljs.core.chunked_seq.call(null, this__8894.vec, this__8894.node, this__8894.i, this__8894.off + 1);
    if(s__8895 == null) {
      return null
    }else {
      return s__8895
    }
  }else {
    return coll.cljs$core$IChunkedNext$_chunked_next$arity$1(coll)
  }
};
cljs.core.ChunkedSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__8896 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.ChunkedSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__8897 = this;
  return coll
};
cljs.core.ChunkedSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__8898 = this;
  return this__8898.node[this__8898.off]
};
cljs.core.ChunkedSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__8899 = this;
  if(this__8899.off + 1 < this__8899.node.length) {
    var s__8900 = cljs.core.chunked_seq.call(null, this__8899.vec, this__8899.node, this__8899.i, this__8899.off + 1);
    if(s__8900 == null) {
      return cljs.core.List.EMPTY
    }else {
      return s__8900
    }
  }else {
    return coll.cljs$core$IChunkedSeq$_chunked_rest$arity$1(coll)
  }
};
cljs.core.ChunkedSeq.prototype.cljs$core$IChunkedNext$ = true;
cljs.core.ChunkedSeq.prototype.cljs$core$IChunkedNext$_chunked_next$arity$1 = function(coll) {
  var this__8901 = this;
  var l__8902 = this__8901.node.length;
  var s__8903 = this__8901.i + l__8902 < cljs.core._count.call(null, this__8901.vec) ? cljs.core.chunked_seq.call(null, this__8901.vec, this__8901.i + l__8902, 0) : null;
  if(s__8903 == null) {
    return null
  }else {
    return s__8903
  }
};
cljs.core.ChunkedSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__8904 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.ChunkedSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, m) {
  var this__8905 = this;
  return cljs.core.chunked_seq.call(null, this__8905.vec, this__8905.node, this__8905.i, this__8905.off, m)
};
cljs.core.ChunkedSeq.prototype.cljs$core$IWithMeta$_meta$arity$1 = function(coll) {
  var this__8906 = this;
  return this__8906.meta
};
cljs.core.ChunkedSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__8907 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.EMPTY, this__8907.meta)
};
cljs.core.ChunkedSeq.prototype.cljs$core$IChunkedSeq$ = true;
cljs.core.ChunkedSeq.prototype.cljs$core$IChunkedSeq$_chunked_first$arity$1 = function(coll) {
  var this__8908 = this;
  return cljs.core.array_chunk.call(null, this__8908.node, this__8908.off)
};
cljs.core.ChunkedSeq.prototype.cljs$core$IChunkedSeq$_chunked_rest$arity$1 = function(coll) {
  var this__8909 = this;
  var l__8910 = this__8909.node.length;
  var s__8911 = this__8909.i + l__8910 < cljs.core._count.call(null, this__8909.vec) ? cljs.core.chunked_seq.call(null, this__8909.vec, this__8909.i + l__8910, 0) : null;
  if(s__8911 == null) {
    return cljs.core.List.EMPTY
  }else {
    return s__8911
  }
};
cljs.core.ChunkedSeq;
cljs.core.chunked_seq = function() {
  var chunked_seq = null;
  var chunked_seq__3 = function(vec, i, off) {
    return chunked_seq.call(null, vec, cljs.core.array_for.call(null, vec, i), i, off, null)
  };
  var chunked_seq__4 = function(vec, node, i, off) {
    return chunked_seq.call(null, vec, node, i, off, null)
  };
  var chunked_seq__5 = function(vec, node, i, off, meta) {
    return new cljs.core.ChunkedSeq(vec, node, i, off, meta)
  };
  chunked_seq = function(vec, node, i, off, meta) {
    switch(arguments.length) {
      case 3:
        return chunked_seq__3.call(this, vec, node, i);
      case 4:
        return chunked_seq__4.call(this, vec, node, i, off);
      case 5:
        return chunked_seq__5.call(this, vec, node, i, off, meta)
    }
    throw"Invalid arity: " + arguments.length;
  };
  chunked_seq.cljs$lang$arity$3 = chunked_seq__3;
  chunked_seq.cljs$lang$arity$4 = chunked_seq__4;
  chunked_seq.cljs$lang$arity$5 = chunked_seq__5;
  return chunked_seq
}();
cljs.core.Subvec = function(meta, v, start, end, __hash) {
  this.meta = meta;
  this.v = v;
  this.start = start;
  this.end = end;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32400159
};
cljs.core.Subvec.cljs$lang$type = true;
cljs.core.Subvec.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/Subvec")
};
cljs.core.Subvec.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__8914 = this;
  var h__2188__auto____8915 = this__8914.__hash;
  if(!(h__2188__auto____8915 == null)) {
    return h__2188__auto____8915
  }else {
    var h__2188__auto____8916 = cljs.core.hash_coll.call(null, coll);
    this__8914.__hash = h__2188__auto____8916;
    return h__2188__auto____8916
  }
};
cljs.core.Subvec.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__8917 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, null)
};
cljs.core.Subvec.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__8918 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, not_found)
};
cljs.core.Subvec.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, key, val) {
  var this__8919 = this;
  var v_pos__8920 = this__8919.start + key;
  return new cljs.core.Subvec(this__8919.meta, cljs.core._assoc.call(null, this__8919.v, v_pos__8920, val), this__8919.start, this__8919.end > v_pos__8920 + 1 ? this__8919.end : v_pos__8920 + 1, null)
};
cljs.core.Subvec.prototype.call = function() {
  var G__8946 = null;
  var G__8946__2 = function(this_sym8921, k) {
    var this__8923 = this;
    var this_sym8921__8924 = this;
    var coll__8925 = this_sym8921__8924;
    return coll__8925.cljs$core$ILookup$_lookup$arity$2(coll__8925, k)
  };
  var G__8946__3 = function(this_sym8922, k, not_found) {
    var this__8923 = this;
    var this_sym8922__8926 = this;
    var coll__8927 = this_sym8922__8926;
    return coll__8927.cljs$core$ILookup$_lookup$arity$3(coll__8927, k, not_found)
  };
  G__8946 = function(this_sym8922, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__8946__2.call(this, this_sym8922, k);
      case 3:
        return G__8946__3.call(this, this_sym8922, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__8946
}();
cljs.core.Subvec.prototype.apply = function(this_sym8912, args8913) {
  var this__8928 = this;
  return this_sym8912.call.apply(this_sym8912, [this_sym8912].concat(args8913.slice()))
};
cljs.core.Subvec.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__8929 = this;
  return new cljs.core.Subvec(this__8929.meta, cljs.core._assoc_n.call(null, this__8929.v, this__8929.end, o), this__8929.start, this__8929.end + 1, null)
};
cljs.core.Subvec.prototype.toString = function() {
  var this__8930 = this;
  var this__8931 = this;
  return cljs.core.pr_str.call(null, this__8931)
};
cljs.core.Subvec.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var this__8932 = this;
  return cljs.core.ci_reduce.call(null, coll, f)
};
cljs.core.Subvec.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var this__8933 = this;
  return cljs.core.ci_reduce.call(null, coll, f, start)
};
cljs.core.Subvec.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__8934 = this;
  var subvec_seq__8935 = function subvec_seq(i) {
    if(i === this__8934.end) {
      return null
    }else {
      return cljs.core.cons.call(null, cljs.core._nth.call(null, this__8934.v, i), new cljs.core.LazySeq(null, false, function() {
        return subvec_seq.call(null, i + 1)
      }, null))
    }
  };
  return subvec_seq__8935.call(null, this__8934.start)
};
cljs.core.Subvec.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__8936 = this;
  return this__8936.end - this__8936.start
};
cljs.core.Subvec.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__8937 = this;
  return cljs.core._nth.call(null, this__8937.v, this__8937.end - 1)
};
cljs.core.Subvec.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__8938 = this;
  if(this__8938.start === this__8938.end) {
    throw new Error("Can't pop empty vector");
  }else {
    return new cljs.core.Subvec(this__8938.meta, this__8938.v, this__8938.start, this__8938.end - 1, null)
  }
};
cljs.core.Subvec.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(coll, n, val) {
  var this__8939 = this;
  return coll.cljs$core$IAssociative$_assoc$arity$3(coll, n, val)
};
cljs.core.Subvec.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__8940 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.Subvec.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__8941 = this;
  return new cljs.core.Subvec(meta, this__8941.v, this__8941.start, this__8941.end, this__8941.__hash)
};
cljs.core.Subvec.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__8942 = this;
  return this__8942.meta
};
cljs.core.Subvec.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__8943 = this;
  return cljs.core._nth.call(null, this__8943.v, this__8943.start + n)
};
cljs.core.Subvec.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__8944 = this;
  return cljs.core._nth.call(null, this__8944.v, this__8944.start + n, not_found)
};
cljs.core.Subvec.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__8945 = this;
  return cljs.core.with_meta.call(null, cljs.core.Vector.EMPTY, this__8945.meta)
};
cljs.core.Subvec;
cljs.core.subvec = function() {
  var subvec = null;
  var subvec__2 = function(v, start) {
    return subvec.call(null, v, start, cljs.core.count.call(null, v))
  };
  var subvec__3 = function(v, start, end) {
    return new cljs.core.Subvec(null, v, start, end, null)
  };
  subvec = function(v, start, end) {
    switch(arguments.length) {
      case 2:
        return subvec__2.call(this, v, start);
      case 3:
        return subvec__3.call(this, v, start, end)
    }
    throw"Invalid arity: " + arguments.length;
  };
  subvec.cljs$lang$arity$2 = subvec__2;
  subvec.cljs$lang$arity$3 = subvec__3;
  return subvec
}();
cljs.core.tv_ensure_editable = function tv_ensure_editable(edit, node) {
  if(edit === node.edit) {
    return node
  }else {
    return new cljs.core.VectorNode(edit, node.arr.slice())
  }
};
cljs.core.tv_editable_root = function tv_editable_root(node) {
  return new cljs.core.VectorNode({}, node.arr.slice())
};
cljs.core.tv_editable_tail = function tv_editable_tail(tl) {
  var ret__8948 = cljs.core.make_array.call(null, 32);
  cljs.core.array_copy.call(null, tl, 0, ret__8948, 0, tl.length);
  return ret__8948
};
cljs.core.tv_push_tail = function tv_push_tail(tv, level, parent, tail_node) {
  var ret__8952 = cljs.core.tv_ensure_editable.call(null, tv.root.edit, parent);
  var subidx__8953 = tv.cnt - 1 >>> level & 31;
  cljs.core.pv_aset.call(null, ret__8952, subidx__8953, level === 5 ? tail_node : function() {
    var child__8954 = cljs.core.pv_aget.call(null, ret__8952, subidx__8953);
    if(!(child__8954 == null)) {
      return tv_push_tail.call(null, tv, level - 5, child__8954, tail_node)
    }else {
      return cljs.core.new_path.call(null, tv.root.edit, level - 5, tail_node)
    }
  }());
  return ret__8952
};
cljs.core.tv_pop_tail = function tv_pop_tail(tv, level, node) {
  var node__8959 = cljs.core.tv_ensure_editable.call(null, tv.root.edit, node);
  var subidx__8960 = tv.cnt - 2 >>> level & 31;
  if(level > 5) {
    var new_child__8961 = tv_pop_tail.call(null, tv, level - 5, cljs.core.pv_aget.call(null, node__8959, subidx__8960));
    if(function() {
      var and__3822__auto____8962 = new_child__8961 == null;
      if(and__3822__auto____8962) {
        return subidx__8960 === 0
      }else {
        return and__3822__auto____8962
      }
    }()) {
      return null
    }else {
      cljs.core.pv_aset.call(null, node__8959, subidx__8960, new_child__8961);
      return node__8959
    }
  }else {
    if(subidx__8960 === 0) {
      return null
    }else {
      if("\ufdd0'else") {
        cljs.core.pv_aset.call(null, node__8959, subidx__8960, null);
        return node__8959
      }else {
        return null
      }
    }
  }
};
cljs.core.editable_array_for = function editable_array_for(tv, i) {
  if(function() {
    var and__3822__auto____8967 = 0 <= i;
    if(and__3822__auto____8967) {
      return i < tv.cnt
    }else {
      return and__3822__auto____8967
    }
  }()) {
    if(i >= cljs.core.tail_off.call(null, tv)) {
      return tv.tail
    }else {
      var root__8968 = tv.root;
      var node__8969 = root__8968;
      var level__8970 = tv.shift;
      while(true) {
        if(level__8970 > 0) {
          var G__8971 = cljs.core.tv_ensure_editable.call(null, root__8968.edit, cljs.core.pv_aget.call(null, node__8969, i >>> level__8970 & 31));
          var G__8972 = level__8970 - 5;
          node__8969 = G__8971;
          level__8970 = G__8972;
          continue
        }else {
          return node__8969.arr
        }
        break
      }
    }
  }else {
    throw new Error([cljs.core.str("No item "), cljs.core.str(i), cljs.core.str(" in transient vector of length "), cljs.core.str(tv.cnt)].join(""));
  }
};
cljs.core.TransientVector = function(cnt, shift, root, tail) {
  this.cnt = cnt;
  this.shift = shift;
  this.root = root;
  this.tail = tail;
  this.cljs$lang$protocol_mask$partition0$ = 275;
  this.cljs$lang$protocol_mask$partition1$ = 22
};
cljs.core.TransientVector.cljs$lang$type = true;
cljs.core.TransientVector.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/TransientVector")
};
cljs.core.TransientVector.prototype.call = function() {
  var G__9012 = null;
  var G__9012__2 = function(this_sym8975, k) {
    var this__8977 = this;
    var this_sym8975__8978 = this;
    var coll__8979 = this_sym8975__8978;
    return coll__8979.cljs$core$ILookup$_lookup$arity$2(coll__8979, k)
  };
  var G__9012__3 = function(this_sym8976, k, not_found) {
    var this__8977 = this;
    var this_sym8976__8980 = this;
    var coll__8981 = this_sym8976__8980;
    return coll__8981.cljs$core$ILookup$_lookup$arity$3(coll__8981, k, not_found)
  };
  G__9012 = function(this_sym8976, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9012__2.call(this, this_sym8976, k);
      case 3:
        return G__9012__3.call(this, this_sym8976, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9012
}();
cljs.core.TransientVector.prototype.apply = function(this_sym8973, args8974) {
  var this__8982 = this;
  return this_sym8973.call.apply(this_sym8973, [this_sym8973].concat(args8974.slice()))
};
cljs.core.TransientVector.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__8983 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, null)
};
cljs.core.TransientVector.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__8984 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, not_found)
};
cljs.core.TransientVector.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__8985 = this;
  if(this__8985.root.edit) {
    return cljs.core.array_for.call(null, coll, n)[n & 31]
  }else {
    throw new Error("nth after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__8986 = this;
  if(function() {
    var and__3822__auto____8987 = 0 <= n;
    if(and__3822__auto____8987) {
      return n < this__8986.cnt
    }else {
      return and__3822__auto____8987
    }
  }()) {
    return coll.cljs$core$IIndexed$_nth$arity$2(coll, n)
  }else {
    return not_found
  }
};
cljs.core.TransientVector.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__8988 = this;
  if(this__8988.root.edit) {
    return this__8988.cnt
  }else {
    throw new Error("count after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$ITransientVector$_assoc_n_BANG_$arity$3 = function(tcoll, n, val) {
  var this__8989 = this;
  if(this__8989.root.edit) {
    if(function() {
      var and__3822__auto____8990 = 0 <= n;
      if(and__3822__auto____8990) {
        return n < this__8989.cnt
      }else {
        return and__3822__auto____8990
      }
    }()) {
      if(cljs.core.tail_off.call(null, tcoll) <= n) {
        this__8989.tail[n & 31] = val;
        return tcoll
      }else {
        var new_root__8995 = function go(level, node) {
          var node__8993 = cljs.core.tv_ensure_editable.call(null, this__8989.root.edit, node);
          if(level === 0) {
            cljs.core.pv_aset.call(null, node__8993, n & 31, val);
            return node__8993
          }else {
            var subidx__8994 = n >>> level & 31;
            cljs.core.pv_aset.call(null, node__8993, subidx__8994, go.call(null, level - 5, cljs.core.pv_aget.call(null, node__8993, subidx__8994)));
            return node__8993
          }
        }.call(null, this__8989.shift, this__8989.root);
        this__8989.root = new_root__8995;
        return tcoll
      }
    }else {
      if(n === this__8989.cnt) {
        return tcoll.cljs$core$ITransientCollection$_conj_BANG_$arity$2(tcoll, val)
      }else {
        if("\ufdd0'else") {
          throw new Error([cljs.core.str("Index "), cljs.core.str(n), cljs.core.str(" out of bounds for TransientVector of length"), cljs.core.str(this__8989.cnt)].join(""));
        }else {
          return null
        }
      }
    }
  }else {
    throw new Error("assoc! after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$ITransientVector$_pop_BANG_$arity$1 = function(tcoll) {
  var this__8996 = this;
  if(this__8996.root.edit) {
    if(this__8996.cnt === 0) {
      throw new Error("Can't pop empty vector");
    }else {
      if(1 === this__8996.cnt) {
        this__8996.cnt = 0;
        return tcoll
      }else {
        if((this__8996.cnt - 1 & 31) > 0) {
          this__8996.cnt = this__8996.cnt - 1;
          return tcoll
        }else {
          if("\ufdd0'else") {
            var new_tail__8997 = cljs.core.editable_array_for.call(null, tcoll, this__8996.cnt - 2);
            var new_root__8999 = function() {
              var nr__8998 = cljs.core.tv_pop_tail.call(null, tcoll, this__8996.shift, this__8996.root);
              if(!(nr__8998 == null)) {
                return nr__8998
              }else {
                return new cljs.core.VectorNode(this__8996.root.edit, cljs.core.make_array.call(null, 32))
              }
            }();
            if(function() {
              var and__3822__auto____9000 = 5 < this__8996.shift;
              if(and__3822__auto____9000) {
                return cljs.core.pv_aget.call(null, new_root__8999, 1) == null
              }else {
                return and__3822__auto____9000
              }
            }()) {
              var new_root__9001 = cljs.core.tv_ensure_editable.call(null, this__8996.root.edit, cljs.core.pv_aget.call(null, new_root__8999, 0));
              this__8996.root = new_root__9001;
              this__8996.shift = this__8996.shift - 5;
              this__8996.cnt = this__8996.cnt - 1;
              this__8996.tail = new_tail__8997;
              return tcoll
            }else {
              this__8996.root = new_root__8999;
              this__8996.cnt = this__8996.cnt - 1;
              this__8996.tail = new_tail__8997;
              return tcoll
            }
          }else {
            return null
          }
        }
      }
    }
  }else {
    throw new Error("pop! after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3 = function(tcoll, key, val) {
  var this__9002 = this;
  return tcoll.cljs$core$ITransientVector$_assoc_n_BANG_$arity$3(tcoll, key, val)
};
cljs.core.TransientVector.prototype.cljs$core$ITransientCollection$_conj_BANG_$arity$2 = function(tcoll, o) {
  var this__9003 = this;
  if(this__9003.root.edit) {
    if(this__9003.cnt - cljs.core.tail_off.call(null, tcoll) < 32) {
      this__9003.tail[this__9003.cnt & 31] = o;
      this__9003.cnt = this__9003.cnt + 1;
      return tcoll
    }else {
      var tail_node__9004 = new cljs.core.VectorNode(this__9003.root.edit, this__9003.tail);
      var new_tail__9005 = cljs.core.make_array.call(null, 32);
      new_tail__9005[0] = o;
      this__9003.tail = new_tail__9005;
      if(this__9003.cnt >>> 5 > 1 << this__9003.shift) {
        var new_root_array__9006 = cljs.core.make_array.call(null, 32);
        var new_shift__9007 = this__9003.shift + 5;
        new_root_array__9006[0] = this__9003.root;
        new_root_array__9006[1] = cljs.core.new_path.call(null, this__9003.root.edit, this__9003.shift, tail_node__9004);
        this__9003.root = new cljs.core.VectorNode(this__9003.root.edit, new_root_array__9006);
        this__9003.shift = new_shift__9007;
        this__9003.cnt = this__9003.cnt + 1;
        return tcoll
      }else {
        var new_root__9008 = cljs.core.tv_push_tail.call(null, tcoll, this__9003.shift, this__9003.root, tail_node__9004);
        this__9003.root = new_root__9008;
        this__9003.cnt = this__9003.cnt + 1;
        return tcoll
      }
    }
  }else {
    throw new Error("conj! after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$ITransientCollection$_persistent_BANG_$arity$1 = function(tcoll) {
  var this__9009 = this;
  if(this__9009.root.edit) {
    this__9009.root.edit = null;
    var len__9010 = this__9009.cnt - cljs.core.tail_off.call(null, tcoll);
    var trimmed_tail__9011 = cljs.core.make_array.call(null, len__9010);
    cljs.core.array_copy.call(null, this__9009.tail, 0, trimmed_tail__9011, 0, len__9010);
    return new cljs.core.PersistentVector(null, this__9009.cnt, this__9009.shift, this__9009.root, trimmed_tail__9011, null)
  }else {
    throw new Error("persistent! called twice");
  }
};
cljs.core.TransientVector;
cljs.core.PersistentQueueSeq = function(meta, front, rear, __hash) {
  this.meta = meta;
  this.front = front;
  this.rear = rear;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31850572
};
cljs.core.PersistentQueueSeq.cljs$lang$type = true;
cljs.core.PersistentQueueSeq.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentQueueSeq")
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9013 = this;
  var h__2188__auto____9014 = this__9013.__hash;
  if(!(h__2188__auto____9014 == null)) {
    return h__2188__auto____9014
  }else {
    var h__2188__auto____9015 = cljs.core.hash_coll.call(null, coll);
    this__9013.__hash = h__2188__auto____9015;
    return h__2188__auto____9015
  }
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__9016 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.PersistentQueueSeq.prototype.toString = function() {
  var this__9017 = this;
  var this__9018 = this;
  return cljs.core.pr_str.call(null, this__9018)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__9019 = this;
  return coll
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__9020 = this;
  return cljs.core._first.call(null, this__9020.front)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__9021 = this;
  var temp__3971__auto____9022 = cljs.core.next.call(null, this__9021.front);
  if(temp__3971__auto____9022) {
    var f1__9023 = temp__3971__auto____9022;
    return new cljs.core.PersistentQueueSeq(this__9021.meta, f1__9023, this__9021.rear, null)
  }else {
    if(this__9021.rear == null) {
      return coll.cljs$core$IEmptyableCollection$_empty$arity$1(coll)
    }else {
      return new cljs.core.PersistentQueueSeq(this__9021.meta, this__9021.rear, null, null)
    }
  }
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9024 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9025 = this;
  return new cljs.core.PersistentQueueSeq(meta, this__9025.front, this__9025.rear, this__9025.__hash)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9026 = this;
  return this__9026.meta
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9027 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__9027.meta)
};
cljs.core.PersistentQueueSeq;
cljs.core.PersistentQueue = function(meta, count, front, rear, __hash) {
  this.meta = meta;
  this.count = count;
  this.front = front;
  this.rear = rear;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31858766
};
cljs.core.PersistentQueue.cljs$lang$type = true;
cljs.core.PersistentQueue.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentQueue")
};
cljs.core.PersistentQueue.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9028 = this;
  var h__2188__auto____9029 = this__9028.__hash;
  if(!(h__2188__auto____9029 == null)) {
    return h__2188__auto____9029
  }else {
    var h__2188__auto____9030 = cljs.core.hash_coll.call(null, coll);
    this__9028.__hash = h__2188__auto____9030;
    return h__2188__auto____9030
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__9031 = this;
  if(cljs.core.truth_(this__9031.front)) {
    return new cljs.core.PersistentQueue(this__9031.meta, this__9031.count + 1, this__9031.front, cljs.core.conj.call(null, function() {
      var or__3824__auto____9032 = this__9031.rear;
      if(cljs.core.truth_(or__3824__auto____9032)) {
        return or__3824__auto____9032
      }else {
        return cljs.core.PersistentVector.EMPTY
      }
    }(), o), null)
  }else {
    return new cljs.core.PersistentQueue(this__9031.meta, this__9031.count + 1, cljs.core.conj.call(null, this__9031.front, o), cljs.core.PersistentVector.EMPTY, null)
  }
};
cljs.core.PersistentQueue.prototype.toString = function() {
  var this__9033 = this;
  var this__9034 = this;
  return cljs.core.pr_str.call(null, this__9034)
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__9035 = this;
  var rear__9036 = cljs.core.seq.call(null, this__9035.rear);
  if(cljs.core.truth_(function() {
    var or__3824__auto____9037 = this__9035.front;
    if(cljs.core.truth_(or__3824__auto____9037)) {
      return or__3824__auto____9037
    }else {
      return rear__9036
    }
  }())) {
    return new cljs.core.PersistentQueueSeq(null, this__9035.front, cljs.core.seq.call(null, rear__9036), null)
  }else {
    return null
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9038 = this;
  return this__9038.count
};
cljs.core.PersistentQueue.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__9039 = this;
  return cljs.core._first.call(null, this__9039.front)
};
cljs.core.PersistentQueue.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__9040 = this;
  if(cljs.core.truth_(this__9040.front)) {
    var temp__3971__auto____9041 = cljs.core.next.call(null, this__9040.front);
    if(temp__3971__auto____9041) {
      var f1__9042 = temp__3971__auto____9041;
      return new cljs.core.PersistentQueue(this__9040.meta, this__9040.count - 1, f1__9042, this__9040.rear, null)
    }else {
      return new cljs.core.PersistentQueue(this__9040.meta, this__9040.count - 1, cljs.core.seq.call(null, this__9040.rear), cljs.core.PersistentVector.EMPTY, null)
    }
  }else {
    return coll
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__9043 = this;
  return cljs.core.first.call(null, this__9043.front)
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__9044 = this;
  return cljs.core.rest.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.PersistentQueue.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9045 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentQueue.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9046 = this;
  return new cljs.core.PersistentQueue(meta, this__9046.count, this__9046.front, this__9046.rear, this__9046.__hash)
};
cljs.core.PersistentQueue.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9047 = this;
  return this__9047.meta
};
cljs.core.PersistentQueue.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9048 = this;
  return cljs.core.PersistentQueue.EMPTY
};
cljs.core.PersistentQueue;
cljs.core.PersistentQueue.EMPTY = new cljs.core.PersistentQueue(null, 0, null, cljs.core.PersistentVector.EMPTY, 0);
cljs.core.NeverEquiv = function() {
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 2097152
};
cljs.core.NeverEquiv.cljs$lang$type = true;
cljs.core.NeverEquiv.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/NeverEquiv")
};
cljs.core.NeverEquiv.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(o, other) {
  var this__9049 = this;
  return false
};
cljs.core.NeverEquiv;
cljs.core.never_equiv = new cljs.core.NeverEquiv;
cljs.core.equiv_map = function equiv_map(x, y) {
  return cljs.core.boolean$.call(null, cljs.core.map_QMARK_.call(null, y) ? cljs.core.count.call(null, x) === cljs.core.count.call(null, y) ? cljs.core.every_QMARK_.call(null, cljs.core.identity, cljs.core.map.call(null, function(xkv) {
    return cljs.core._EQ_.call(null, cljs.core._lookup.call(null, y, cljs.core.first.call(null, xkv), cljs.core.never_equiv), cljs.core.second.call(null, xkv))
  }, x)) : null : null)
};
cljs.core.scan_array = function scan_array(incr, k, array) {
  var len__9052 = array.length;
  var i__9053 = 0;
  while(true) {
    if(i__9053 < len__9052) {
      if(k === array[i__9053]) {
        return i__9053
      }else {
        var G__9054 = i__9053 + incr;
        i__9053 = G__9054;
        continue
      }
    }else {
      return null
    }
    break
  }
};
cljs.core.obj_map_compare_keys = function obj_map_compare_keys(a, b) {
  var a__9057 = cljs.core.hash.call(null, a);
  var b__9058 = cljs.core.hash.call(null, b);
  if(a__9057 < b__9058) {
    return-1
  }else {
    if(a__9057 > b__9058) {
      return 1
    }else {
      if("\ufdd0'else") {
        return 0
      }else {
        return null
      }
    }
  }
};
cljs.core.obj_map__GT_hash_map = function obj_map__GT_hash_map(m, k, v) {
  var ks__9066 = m.keys;
  var len__9067 = ks__9066.length;
  var so__9068 = m.strobj;
  var out__9069 = cljs.core.with_meta.call(null, cljs.core.PersistentHashMap.EMPTY, cljs.core.meta.call(null, m));
  var i__9070 = 0;
  var out__9071 = cljs.core.transient$.call(null, out__9069);
  while(true) {
    if(i__9070 < len__9067) {
      var k__9072 = ks__9066[i__9070];
      var G__9073 = i__9070 + 1;
      var G__9074 = cljs.core.assoc_BANG_.call(null, out__9071, k__9072, so__9068[k__9072]);
      i__9070 = G__9073;
      out__9071 = G__9074;
      continue
    }else {
      return cljs.core.persistent_BANG_.call(null, cljs.core.assoc_BANG_.call(null, out__9071, k, v))
    }
    break
  }
};
cljs.core.obj_clone = function obj_clone(obj, ks) {
  var new_obj__9080 = {};
  var l__9081 = ks.length;
  var i__9082 = 0;
  while(true) {
    if(i__9082 < l__9081) {
      var k__9083 = ks[i__9082];
      new_obj__9080[k__9083] = obj[k__9083];
      var G__9084 = i__9082 + 1;
      i__9082 = G__9084;
      continue
    }else {
    }
    break
  }
  return new_obj__9080
};
cljs.core.ObjMap = function(meta, keys, strobj, update_count, __hash) {
  this.meta = meta;
  this.keys = keys;
  this.strobj = strobj;
  this.update_count = update_count;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 1;
  this.cljs$lang$protocol_mask$partition0$ = 15075087
};
cljs.core.ObjMap.cljs$lang$type = true;
cljs.core.ObjMap.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/ObjMap")
};
cljs.core.ObjMap.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var this__9087 = this;
  return cljs.core.transient$.call(null, cljs.core.into.call(null, cljs.core.hash_map.call(null), coll))
};
cljs.core.ObjMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9088 = this;
  var h__2188__auto____9089 = this__9088.__hash;
  if(!(h__2188__auto____9089 == null)) {
    return h__2188__auto____9089
  }else {
    var h__2188__auto____9090 = cljs.core.hash_imap.call(null, coll);
    this__9088.__hash = h__2188__auto____9090;
    return h__2188__auto____9090
  }
};
cljs.core.ObjMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__9091 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, k, null)
};
cljs.core.ObjMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__9092 = this;
  if(function() {
    var and__3822__auto____9093 = goog.isString(k);
    if(and__3822__auto____9093) {
      return!(cljs.core.scan_array.call(null, 1, k, this__9092.keys) == null)
    }else {
      return and__3822__auto____9093
    }
  }()) {
    return this__9092.strobj[k]
  }else {
    return not_found
  }
};
cljs.core.ObjMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__9094 = this;
  if(goog.isString(k)) {
    if(function() {
      var or__3824__auto____9095 = this__9094.update_count > cljs.core.ObjMap.HASHMAP_THRESHOLD;
      if(or__3824__auto____9095) {
        return or__3824__auto____9095
      }else {
        return this__9094.keys.length >= cljs.core.ObjMap.HASHMAP_THRESHOLD
      }
    }()) {
      return cljs.core.obj_map__GT_hash_map.call(null, coll, k, v)
    }else {
      if(!(cljs.core.scan_array.call(null, 1, k, this__9094.keys) == null)) {
        var new_strobj__9096 = cljs.core.obj_clone.call(null, this__9094.strobj, this__9094.keys);
        new_strobj__9096[k] = v;
        return new cljs.core.ObjMap(this__9094.meta, this__9094.keys, new_strobj__9096, this__9094.update_count + 1, null)
      }else {
        var new_strobj__9097 = cljs.core.obj_clone.call(null, this__9094.strobj, this__9094.keys);
        var new_keys__9098 = this__9094.keys.slice();
        new_strobj__9097[k] = v;
        new_keys__9098.push(k);
        return new cljs.core.ObjMap(this__9094.meta, new_keys__9098, new_strobj__9097, this__9094.update_count + 1, null)
      }
    }
  }else {
    return cljs.core.obj_map__GT_hash_map.call(null, coll, k, v)
  }
};
cljs.core.ObjMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__9099 = this;
  if(function() {
    var and__3822__auto____9100 = goog.isString(k);
    if(and__3822__auto____9100) {
      return!(cljs.core.scan_array.call(null, 1, k, this__9099.keys) == null)
    }else {
      return and__3822__auto____9100
    }
  }()) {
    return true
  }else {
    return false
  }
};
cljs.core.ObjMap.prototype.call = function() {
  var G__9122 = null;
  var G__9122__2 = function(this_sym9101, k) {
    var this__9103 = this;
    var this_sym9101__9104 = this;
    var coll__9105 = this_sym9101__9104;
    return coll__9105.cljs$core$ILookup$_lookup$arity$2(coll__9105, k)
  };
  var G__9122__3 = function(this_sym9102, k, not_found) {
    var this__9103 = this;
    var this_sym9102__9106 = this;
    var coll__9107 = this_sym9102__9106;
    return coll__9107.cljs$core$ILookup$_lookup$arity$3(coll__9107, k, not_found)
  };
  G__9122 = function(this_sym9102, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9122__2.call(this, this_sym9102, k);
      case 3:
        return G__9122__3.call(this, this_sym9102, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9122
}();
cljs.core.ObjMap.prototype.apply = function(this_sym9085, args9086) {
  var this__9108 = this;
  return this_sym9085.call.apply(this_sym9085, [this_sym9085].concat(args9086.slice()))
};
cljs.core.ObjMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__9109 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.ObjMap.prototype.toString = function() {
  var this__9110 = this;
  var this__9111 = this;
  return cljs.core.pr_str.call(null, this__9111)
};
cljs.core.ObjMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__9112 = this;
  if(this__9112.keys.length > 0) {
    return cljs.core.map.call(null, function(p1__9075_SHARP_) {
      return cljs.core.vector.call(null, p1__9075_SHARP_, this__9112.strobj[p1__9075_SHARP_])
    }, this__9112.keys.sort(cljs.core.obj_map_compare_keys))
  }else {
    return null
  }
};
cljs.core.ObjMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9113 = this;
  return this__9113.keys.length
};
cljs.core.ObjMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9114 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.ObjMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9115 = this;
  return new cljs.core.ObjMap(meta, this__9115.keys, this__9115.strobj, this__9115.update_count, this__9115.__hash)
};
cljs.core.ObjMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9116 = this;
  return this__9116.meta
};
cljs.core.ObjMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9117 = this;
  return cljs.core.with_meta.call(null, cljs.core.ObjMap.EMPTY, this__9117.meta)
};
cljs.core.ObjMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__9118 = this;
  if(function() {
    var and__3822__auto____9119 = goog.isString(k);
    if(and__3822__auto____9119) {
      return!(cljs.core.scan_array.call(null, 1, k, this__9118.keys) == null)
    }else {
      return and__3822__auto____9119
    }
  }()) {
    var new_keys__9120 = this__9118.keys.slice();
    var new_strobj__9121 = cljs.core.obj_clone.call(null, this__9118.strobj, this__9118.keys);
    new_keys__9120.splice(cljs.core.scan_array.call(null, 1, k, new_keys__9120), 1);
    cljs.core.js_delete.call(null, new_strobj__9121, k);
    return new cljs.core.ObjMap(this__9118.meta, new_keys__9120, new_strobj__9121, this__9118.update_count + 1, null)
  }else {
    return coll
  }
};
cljs.core.ObjMap;
cljs.core.ObjMap.EMPTY = new cljs.core.ObjMap(null, [], {}, 0, 0);
cljs.core.ObjMap.HASHMAP_THRESHOLD = 32;
cljs.core.ObjMap.fromObject = function(ks, obj) {
  return new cljs.core.ObjMap(null, ks, obj, 0, null)
};
cljs.core.HashMap = function(meta, count, hashobj, __hash) {
  this.meta = meta;
  this.count = count;
  this.hashobj = hashobj;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 15075087
};
cljs.core.HashMap.cljs$lang$type = true;
cljs.core.HashMap.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/HashMap")
};
cljs.core.HashMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9126 = this;
  var h__2188__auto____9127 = this__9126.__hash;
  if(!(h__2188__auto____9127 == null)) {
    return h__2188__auto____9127
  }else {
    var h__2188__auto____9128 = cljs.core.hash_imap.call(null, coll);
    this__9126.__hash = h__2188__auto____9128;
    return h__2188__auto____9128
  }
};
cljs.core.HashMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__9129 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, k, null)
};
cljs.core.HashMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__9130 = this;
  var bucket__9131 = this__9130.hashobj[cljs.core.hash.call(null, k)];
  var i__9132 = cljs.core.truth_(bucket__9131) ? cljs.core.scan_array.call(null, 2, k, bucket__9131) : null;
  if(cljs.core.truth_(i__9132)) {
    return bucket__9131[i__9132 + 1]
  }else {
    return not_found
  }
};
cljs.core.HashMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__9133 = this;
  var h__9134 = cljs.core.hash.call(null, k);
  var bucket__9135 = this__9133.hashobj[h__9134];
  if(cljs.core.truth_(bucket__9135)) {
    var new_bucket__9136 = bucket__9135.slice();
    var new_hashobj__9137 = goog.object.clone(this__9133.hashobj);
    new_hashobj__9137[h__9134] = new_bucket__9136;
    var temp__3971__auto____9138 = cljs.core.scan_array.call(null, 2, k, new_bucket__9136);
    if(cljs.core.truth_(temp__3971__auto____9138)) {
      var i__9139 = temp__3971__auto____9138;
      new_bucket__9136[i__9139 + 1] = v;
      return new cljs.core.HashMap(this__9133.meta, this__9133.count, new_hashobj__9137, null)
    }else {
      new_bucket__9136.push(k, v);
      return new cljs.core.HashMap(this__9133.meta, this__9133.count + 1, new_hashobj__9137, null)
    }
  }else {
    var new_hashobj__9140 = goog.object.clone(this__9133.hashobj);
    new_hashobj__9140[h__9134] = [k, v];
    return new cljs.core.HashMap(this__9133.meta, this__9133.count + 1, new_hashobj__9140, null)
  }
};
cljs.core.HashMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__9141 = this;
  var bucket__9142 = this__9141.hashobj[cljs.core.hash.call(null, k)];
  var i__9143 = cljs.core.truth_(bucket__9142) ? cljs.core.scan_array.call(null, 2, k, bucket__9142) : null;
  if(cljs.core.truth_(i__9143)) {
    return true
  }else {
    return false
  }
};
cljs.core.HashMap.prototype.call = function() {
  var G__9168 = null;
  var G__9168__2 = function(this_sym9144, k) {
    var this__9146 = this;
    var this_sym9144__9147 = this;
    var coll__9148 = this_sym9144__9147;
    return coll__9148.cljs$core$ILookup$_lookup$arity$2(coll__9148, k)
  };
  var G__9168__3 = function(this_sym9145, k, not_found) {
    var this__9146 = this;
    var this_sym9145__9149 = this;
    var coll__9150 = this_sym9145__9149;
    return coll__9150.cljs$core$ILookup$_lookup$arity$3(coll__9150, k, not_found)
  };
  G__9168 = function(this_sym9145, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9168__2.call(this, this_sym9145, k);
      case 3:
        return G__9168__3.call(this, this_sym9145, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9168
}();
cljs.core.HashMap.prototype.apply = function(this_sym9124, args9125) {
  var this__9151 = this;
  return this_sym9124.call.apply(this_sym9124, [this_sym9124].concat(args9125.slice()))
};
cljs.core.HashMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__9152 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.HashMap.prototype.toString = function() {
  var this__9153 = this;
  var this__9154 = this;
  return cljs.core.pr_str.call(null, this__9154)
};
cljs.core.HashMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__9155 = this;
  if(this__9155.count > 0) {
    var hashes__9156 = cljs.core.js_keys.call(null, this__9155.hashobj).sort();
    return cljs.core.mapcat.call(null, function(p1__9123_SHARP_) {
      return cljs.core.map.call(null, cljs.core.vec, cljs.core.partition.call(null, 2, this__9155.hashobj[p1__9123_SHARP_]))
    }, hashes__9156)
  }else {
    return null
  }
};
cljs.core.HashMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9157 = this;
  return this__9157.count
};
cljs.core.HashMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9158 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.HashMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9159 = this;
  return new cljs.core.HashMap(meta, this__9159.count, this__9159.hashobj, this__9159.__hash)
};
cljs.core.HashMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9160 = this;
  return this__9160.meta
};
cljs.core.HashMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9161 = this;
  return cljs.core.with_meta.call(null, cljs.core.HashMap.EMPTY, this__9161.meta)
};
cljs.core.HashMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__9162 = this;
  var h__9163 = cljs.core.hash.call(null, k);
  var bucket__9164 = this__9162.hashobj[h__9163];
  var i__9165 = cljs.core.truth_(bucket__9164) ? cljs.core.scan_array.call(null, 2, k, bucket__9164) : null;
  if(cljs.core.not.call(null, i__9165)) {
    return coll
  }else {
    var new_hashobj__9166 = goog.object.clone(this__9162.hashobj);
    if(3 > bucket__9164.length) {
      cljs.core.js_delete.call(null, new_hashobj__9166, h__9163)
    }else {
      var new_bucket__9167 = bucket__9164.slice();
      new_bucket__9167.splice(i__9165, 2);
      new_hashobj__9166[h__9163] = new_bucket__9167
    }
    return new cljs.core.HashMap(this__9162.meta, this__9162.count - 1, new_hashobj__9166, null)
  }
};
cljs.core.HashMap;
cljs.core.HashMap.EMPTY = new cljs.core.HashMap(null, 0, {}, 0);
cljs.core.HashMap.fromArrays = function(ks, vs) {
  var len__9169 = ks.length;
  var i__9170 = 0;
  var out__9171 = cljs.core.HashMap.EMPTY;
  while(true) {
    if(i__9170 < len__9169) {
      var G__9172 = i__9170 + 1;
      var G__9173 = cljs.core.assoc.call(null, out__9171, ks[i__9170], vs[i__9170]);
      i__9170 = G__9172;
      out__9171 = G__9173;
      continue
    }else {
      return out__9171
    }
    break
  }
};
cljs.core.array_map_index_of = function array_map_index_of(m, k) {
  var arr__9177 = m.arr;
  var len__9178 = arr__9177.length;
  var i__9179 = 0;
  while(true) {
    if(len__9178 <= i__9179) {
      return-1
    }else {
      if(cljs.core._EQ_.call(null, arr__9177[i__9179], k)) {
        return i__9179
      }else {
        if("\ufdd0'else") {
          var G__9180 = i__9179 + 2;
          i__9179 = G__9180;
          continue
        }else {
          return null
        }
      }
    }
    break
  }
};
cljs.core.PersistentArrayMap = function(meta, cnt, arr, __hash) {
  this.meta = meta;
  this.cnt = cnt;
  this.arr = arr;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 1;
  this.cljs$lang$protocol_mask$partition0$ = 16123663
};
cljs.core.PersistentArrayMap.cljs$lang$type = true;
cljs.core.PersistentArrayMap.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentArrayMap")
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var this__9183 = this;
  return new cljs.core.TransientArrayMap({}, this__9183.arr.length, this__9183.arr.slice())
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9184 = this;
  var h__2188__auto____9185 = this__9184.__hash;
  if(!(h__2188__auto____9185 == null)) {
    return h__2188__auto____9185
  }else {
    var h__2188__auto____9186 = cljs.core.hash_imap.call(null, coll);
    this__9184.__hash = h__2188__auto____9186;
    return h__2188__auto____9186
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__9187 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, k, null)
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__9188 = this;
  var idx__9189 = cljs.core.array_map_index_of.call(null, coll, k);
  if(idx__9189 === -1) {
    return not_found
  }else {
    return this__9188.arr[idx__9189 + 1]
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__9190 = this;
  var idx__9191 = cljs.core.array_map_index_of.call(null, coll, k);
  if(idx__9191 === -1) {
    if(this__9190.cnt < cljs.core.PersistentArrayMap.HASHMAP_THRESHOLD) {
      return new cljs.core.PersistentArrayMap(this__9190.meta, this__9190.cnt + 1, function() {
        var G__9192__9193 = this__9190.arr.slice();
        G__9192__9193.push(k);
        G__9192__9193.push(v);
        return G__9192__9193
      }(), null)
    }else {
      return cljs.core.persistent_BANG_.call(null, cljs.core.assoc_BANG_.call(null, cljs.core.transient$.call(null, cljs.core.into.call(null, cljs.core.PersistentHashMap.EMPTY, coll)), k, v))
    }
  }else {
    if(v === this__9190.arr[idx__9191 + 1]) {
      return coll
    }else {
      if("\ufdd0'else") {
        return new cljs.core.PersistentArrayMap(this__9190.meta, this__9190.cnt, function() {
          var G__9194__9195 = this__9190.arr.slice();
          G__9194__9195[idx__9191 + 1] = v;
          return G__9194__9195
        }(), null)
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__9196 = this;
  return!(cljs.core.array_map_index_of.call(null, coll, k) === -1)
};
cljs.core.PersistentArrayMap.prototype.call = function() {
  var G__9228 = null;
  var G__9228__2 = function(this_sym9197, k) {
    var this__9199 = this;
    var this_sym9197__9200 = this;
    var coll__9201 = this_sym9197__9200;
    return coll__9201.cljs$core$ILookup$_lookup$arity$2(coll__9201, k)
  };
  var G__9228__3 = function(this_sym9198, k, not_found) {
    var this__9199 = this;
    var this_sym9198__9202 = this;
    var coll__9203 = this_sym9198__9202;
    return coll__9203.cljs$core$ILookup$_lookup$arity$3(coll__9203, k, not_found)
  };
  G__9228 = function(this_sym9198, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9228__2.call(this, this_sym9198, k);
      case 3:
        return G__9228__3.call(this, this_sym9198, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9228
}();
cljs.core.PersistentArrayMap.prototype.apply = function(this_sym9181, args9182) {
  var this__9204 = this;
  return this_sym9181.call.apply(this_sym9181, [this_sym9181].concat(args9182.slice()))
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = function(coll, f, init) {
  var this__9205 = this;
  var len__9206 = this__9205.arr.length;
  var i__9207 = 0;
  var init__9208 = init;
  while(true) {
    if(i__9207 < len__9206) {
      var init__9209 = f.call(null, init__9208, this__9205.arr[i__9207], this__9205.arr[i__9207 + 1]);
      if(cljs.core.reduced_QMARK_.call(null, init__9209)) {
        return cljs.core.deref.call(null, init__9209)
      }else {
        var G__9229 = i__9207 + 2;
        var G__9230 = init__9209;
        i__9207 = G__9229;
        init__9208 = G__9230;
        continue
      }
    }else {
      return null
    }
    break
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__9210 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.PersistentArrayMap.prototype.toString = function() {
  var this__9211 = this;
  var this__9212 = this;
  return cljs.core.pr_str.call(null, this__9212)
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__9213 = this;
  if(this__9213.cnt > 0) {
    var len__9214 = this__9213.arr.length;
    var array_map_seq__9215 = function array_map_seq(i) {
      return new cljs.core.LazySeq(null, false, function() {
        if(i < len__9214) {
          return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([this__9213.arr[i], this__9213.arr[i + 1]], true), array_map_seq.call(null, i + 2))
        }else {
          return null
        }
      }, null)
    };
    return array_map_seq__9215.call(null, 0)
  }else {
    return null
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9216 = this;
  return this__9216.cnt
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9217 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9218 = this;
  return new cljs.core.PersistentArrayMap(meta, this__9218.cnt, this__9218.arr, this__9218.__hash)
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9219 = this;
  return this__9219.meta
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9220 = this;
  return cljs.core._with_meta.call(null, cljs.core.PersistentArrayMap.EMPTY, this__9220.meta)
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__9221 = this;
  var idx__9222 = cljs.core.array_map_index_of.call(null, coll, k);
  if(idx__9222 >= 0) {
    var len__9223 = this__9221.arr.length;
    var new_len__9224 = len__9223 - 2;
    if(new_len__9224 === 0) {
      return coll.cljs$core$IEmptyableCollection$_empty$arity$1(coll)
    }else {
      var new_arr__9225 = cljs.core.make_array.call(null, new_len__9224);
      var s__9226 = 0;
      var d__9227 = 0;
      while(true) {
        if(s__9226 >= len__9223) {
          return new cljs.core.PersistentArrayMap(this__9221.meta, this__9221.cnt - 1, new_arr__9225, null)
        }else {
          if(cljs.core._EQ_.call(null, k, this__9221.arr[s__9226])) {
            var G__9231 = s__9226 + 2;
            var G__9232 = d__9227;
            s__9226 = G__9231;
            d__9227 = G__9232;
            continue
          }else {
            if("\ufdd0'else") {
              new_arr__9225[d__9227] = this__9221.arr[s__9226];
              new_arr__9225[d__9227 + 1] = this__9221.arr[s__9226 + 1];
              var G__9233 = s__9226 + 2;
              var G__9234 = d__9227 + 2;
              s__9226 = G__9233;
              d__9227 = G__9234;
              continue
            }else {
              return null
            }
          }
        }
        break
      }
    }
  }else {
    return coll
  }
};
cljs.core.PersistentArrayMap;
cljs.core.PersistentArrayMap.EMPTY = new cljs.core.PersistentArrayMap(null, 0, [], null);
cljs.core.PersistentArrayMap.HASHMAP_THRESHOLD = 16;
cljs.core.PersistentArrayMap.fromArrays = function(ks, vs) {
  var len__9235 = cljs.core.count.call(null, ks);
  var i__9236 = 0;
  var out__9237 = cljs.core.transient$.call(null, cljs.core.PersistentArrayMap.EMPTY);
  while(true) {
    if(i__9236 < len__9235) {
      var G__9238 = i__9236 + 1;
      var G__9239 = cljs.core.assoc_BANG_.call(null, out__9237, ks[i__9236], vs[i__9236]);
      i__9236 = G__9238;
      out__9237 = G__9239;
      continue
    }else {
      return cljs.core.persistent_BANG_.call(null, out__9237)
    }
    break
  }
};
cljs.core.TransientArrayMap = function(editable_QMARK_, len, arr) {
  this.editable_QMARK_ = editable_QMARK_;
  this.len = len;
  this.arr = arr;
  this.cljs$lang$protocol_mask$partition1$ = 14;
  this.cljs$lang$protocol_mask$partition0$ = 258
};
cljs.core.TransientArrayMap.cljs$lang$type = true;
cljs.core.TransientArrayMap.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/TransientArrayMap")
};
cljs.core.TransientArrayMap.prototype.cljs$core$ITransientMap$_dissoc_BANG_$arity$2 = function(tcoll, key) {
  var this__9240 = this;
  if(cljs.core.truth_(this__9240.editable_QMARK_)) {
    var idx__9241 = cljs.core.array_map_index_of.call(null, tcoll, key);
    if(idx__9241 >= 0) {
      this__9240.arr[idx__9241] = this__9240.arr[this__9240.len - 2];
      this__9240.arr[idx__9241 + 1] = this__9240.arr[this__9240.len - 1];
      var G__9242__9243 = this__9240.arr;
      G__9242__9243.pop();
      G__9242__9243.pop();
      G__9242__9243;
      this__9240.len = this__9240.len - 2
    }else {
    }
    return tcoll
  }else {
    throw new Error("dissoc! after persistent!");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3 = function(tcoll, key, val) {
  var this__9244 = this;
  if(cljs.core.truth_(this__9244.editable_QMARK_)) {
    var idx__9245 = cljs.core.array_map_index_of.call(null, tcoll, key);
    if(idx__9245 === -1) {
      if(this__9244.len + 2 <= 2 * cljs.core.PersistentArrayMap.HASHMAP_THRESHOLD) {
        this__9244.len = this__9244.len + 2;
        this__9244.arr.push(key);
        this__9244.arr.push(val);
        return tcoll
      }else {
        return cljs.core.assoc_BANG_.call(null, cljs.core.array__GT_transient_hash_map.call(null, this__9244.len, this__9244.arr), key, val)
      }
    }else {
      if(val === this__9244.arr[idx__9245 + 1]) {
        return tcoll
      }else {
        this__9244.arr[idx__9245 + 1] = val;
        return tcoll
      }
    }
  }else {
    throw new Error("assoc! after persistent!");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ITransientCollection$_conj_BANG_$arity$2 = function(tcoll, o) {
  var this__9246 = this;
  if(cljs.core.truth_(this__9246.editable_QMARK_)) {
    if(function() {
      var G__9247__9248 = o;
      if(G__9247__9248) {
        if(function() {
          var or__3824__auto____9249 = G__9247__9248.cljs$lang$protocol_mask$partition0$ & 2048;
          if(or__3824__auto____9249) {
            return or__3824__auto____9249
          }else {
            return G__9247__9248.cljs$core$IMapEntry$
          }
        }()) {
          return true
        }else {
          if(!G__9247__9248.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.IMapEntry, G__9247__9248)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.IMapEntry, G__9247__9248)
      }
    }()) {
      return tcoll.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3(tcoll, cljs.core.key.call(null, o), cljs.core.val.call(null, o))
    }else {
      var es__9250 = cljs.core.seq.call(null, o);
      var tcoll__9251 = tcoll;
      while(true) {
        var temp__3971__auto____9252 = cljs.core.first.call(null, es__9250);
        if(cljs.core.truth_(temp__3971__auto____9252)) {
          var e__9253 = temp__3971__auto____9252;
          var G__9259 = cljs.core.next.call(null, es__9250);
          var G__9260 = tcoll__9251.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3(tcoll__9251, cljs.core.key.call(null, e__9253), cljs.core.val.call(null, e__9253));
          es__9250 = G__9259;
          tcoll__9251 = G__9260;
          continue
        }else {
          return tcoll__9251
        }
        break
      }
    }
  }else {
    throw new Error("conj! after persistent!");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ITransientCollection$_persistent_BANG_$arity$1 = function(tcoll) {
  var this__9254 = this;
  if(cljs.core.truth_(this__9254.editable_QMARK_)) {
    this__9254.editable_QMARK_ = false;
    return new cljs.core.PersistentArrayMap(null, cljs.core.quot.call(null, this__9254.len, 2), this__9254.arr, null)
  }else {
    throw new Error("persistent! called twice");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(tcoll, k) {
  var this__9255 = this;
  return tcoll.cljs$core$ILookup$_lookup$arity$3(tcoll, k, null)
};
cljs.core.TransientArrayMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(tcoll, k, not_found) {
  var this__9256 = this;
  if(cljs.core.truth_(this__9256.editable_QMARK_)) {
    var idx__9257 = cljs.core.array_map_index_of.call(null, tcoll, k);
    if(idx__9257 === -1) {
      return not_found
    }else {
      return this__9256.arr[idx__9257 + 1]
    }
  }else {
    throw new Error("lookup after persistent!");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ICounted$_count$arity$1 = function(tcoll) {
  var this__9258 = this;
  if(cljs.core.truth_(this__9258.editable_QMARK_)) {
    return cljs.core.quot.call(null, this__9258.len, 2)
  }else {
    throw new Error("count after persistent!");
  }
};
cljs.core.TransientArrayMap;
cljs.core.array__GT_transient_hash_map = function array__GT_transient_hash_map(len, arr) {
  var out__9263 = cljs.core.transient$.call(null, cljs.core.ObjMap.EMPTY);
  var i__9264 = 0;
  while(true) {
    if(i__9264 < len) {
      var G__9265 = cljs.core.assoc_BANG_.call(null, out__9263, arr[i__9264], arr[i__9264 + 1]);
      var G__9266 = i__9264 + 2;
      out__9263 = G__9265;
      i__9264 = G__9266;
      continue
    }else {
      return out__9263
    }
    break
  }
};
cljs.core.Box = function(val) {
  this.val = val
};
cljs.core.Box.cljs$lang$type = true;
cljs.core.Box.cljs$lang$ctorPrSeq = function(this__2306__auto__) {
  return cljs.core.list.call(null, "cljs.core/Box")
};
cljs.core.Box;
cljs.core.key_test = function key_test(key, other) {
  if(goog.isString(key)) {
    return key === other
  }else {
    return cljs.core._EQ_.call(null, key, other)
  }
};
cljs.core.mask = function mask(hash, shift) {
  return hash >>> shift & 31
};
cljs.core.clone_and_set = function() {
  var clone_and_set = null;
  var clone_and_set__3 = function(arr, i, a) {
    var G__9271__9272 = arr.slice();
    G__9271__9272[i] = a;
    return G__9271__9272
  };
  var clone_and_set__5 = function(arr, i, a, j, b) {
    var G__9273__9274 = arr.slice();
    G__9273__9274[i] = a;
    G__9273__9274[j] = b;
    return G__9273__9274
  };
  clone_and_set = function(arr, i, a, j, b) {
    switch(arguments.length) {
      case 3:
        return clone_and_set__3.call(this, arr, i, a);
      case 5:
        return clone_and_set__5.call(this, arr, i, a, j, b)
    }
    throw"Invalid arity: " + arguments.length;
  };
  clone_and_set.cljs$lang$arity$3 = clone_and_set__3;
  clone_and_set.cljs$lang$arity$5 = clone_and_set__5;
  return clone_and_set
}();
cljs.core.remove_pair = function remove_pair(arr, i) {
  var new_arr__9276 = cljs.core.make_array.call(null, arr.length - 2);
  cljs.core.array_copy.call(null, arr, 0, new_arr__9276, 0, 2 * i);
  cljs.core.array_copy.call(null, arr, 2 * (i + 1), new_arr__9276, 2 * i, new_arr__9276.length - 2 * i);
  return new_arr__9276
};
cljs.core.bitmap_indexed_node_index = function bitmap_indexed_node_index(bitmap, bit) {
  return cljs.core.bit_count.call(null, bitmap & bit - 1)
};
cljs.core.bitpos = function bitpos(hash, shift) {
  return 1 << (hash >>> shift & 31)
};
cljs.core.edit_and_set = function() {
  var edit_and_set = null;
  var edit_and_set__4 = function(inode, edit, i, a) {
    var editable__9279 = inode.ensure_editable(edit);
    editable__9279.arr[i] = a;
    return editable__9279
  };
  var edit_and_set__6 = function(inode, edit, i, a, j, b) {
    var editable__9280 = inode.ensure_editable(edit);
    editable__9280.arr[i] = a;
    editable__9280.arr[j] = b;
    return editable__9280
  };
  edit_and_set = function(inode, edit, i, a, j, b) {
    switch(arguments.length) {
      case 4:
        return edit_and_set__4.call(this, inode, edit, i, a);
      case 6:
        return edit_and_set__6.call(this, inode, edit, i, a, j, b)
    }
    throw"Invalid arity: " + arguments.length;
  };
  edit_and_set.cljs$lang$arity$4 = edit_and_set__4;
  edit_and_set.cljs$lang$arity$6 = edit_and_set__6;
  return edit_and_set
}();
cljs.core.inode_kv_reduce = function inode_kv_reduce(arr, f, init) {
  var len__9287 = arr.length;
  var i__9288 = 0;
  var init__9289 = init;
  while(true) {
    if(i__9288 < len__9287) {
      var init__9292 = function() {
        var k__9290 = arr[i__9288];
        if(!(k__9290 == null)) {
          return f.call(null, init__9289, k__9290, arr[i__9288 + 1])
        }else {
          var node__9291 = arr[i__9288 + 1];
          if(!(node__9291 == null)) {
            return node__9291.kv_reduce(f, init__9289)
          }else {
            return init__9289
          }
        }
      }();
      if(cljs.core.reduced_QMARK_.call(null, init__9292)) {
        return cljs.core.deref.call(null, init__9292)
      }else {
        var G__9293 = i__9288 + 2;
        var G__9294 = init__9292;
        i__9288 = G__9293;
        init__9289 = G__9294;
        continue
      }
    }else {
      return init__9289
    }
    break
  }
};
cljs.core.BitmapIndexedNode = function(edit, bitmap, arr) {
  this.edit = edit;
  this.bitmap = bitmap;
  this.arr = arr
};
cljs.core.BitmapIndexedNode.cljs$lang$type = true;
cljs.core.BitmapIndexedNode.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/BitmapIndexedNode")
};
cljs.core.BitmapIndexedNode.prototype.edit_and_remove_pair = function(e, bit, i) {
  var this__9295 = this;
  var inode__9296 = this;
  if(this__9295.bitmap === bit) {
    return null
  }else {
    var editable__9297 = inode__9296.ensure_editable(e);
    var earr__9298 = editable__9297.arr;
    var len__9299 = earr__9298.length;
    editable__9297.bitmap = bit ^ editable__9297.bitmap;
    cljs.core.array_copy.call(null, earr__9298, 2 * (i + 1), earr__9298, 2 * i, len__9299 - 2 * (i + 1));
    earr__9298[len__9299 - 2] = null;
    earr__9298[len__9299 - 1] = null;
    return editable__9297
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_assoc_BANG_ = function(edit, shift, hash, key, val, added_leaf_QMARK_) {
  var this__9300 = this;
  var inode__9301 = this;
  var bit__9302 = 1 << (hash >>> shift & 31);
  var idx__9303 = cljs.core.bitmap_indexed_node_index.call(null, this__9300.bitmap, bit__9302);
  if((this__9300.bitmap & bit__9302) === 0) {
    var n__9304 = cljs.core.bit_count.call(null, this__9300.bitmap);
    if(2 * n__9304 < this__9300.arr.length) {
      var editable__9305 = inode__9301.ensure_editable(edit);
      var earr__9306 = editable__9305.arr;
      added_leaf_QMARK_.val = true;
      cljs.core.array_copy_downward.call(null, earr__9306, 2 * idx__9303, earr__9306, 2 * (idx__9303 + 1), 2 * (n__9304 - idx__9303));
      earr__9306[2 * idx__9303] = key;
      earr__9306[2 * idx__9303 + 1] = val;
      editable__9305.bitmap = editable__9305.bitmap | bit__9302;
      return editable__9305
    }else {
      if(n__9304 >= 16) {
        var nodes__9307 = cljs.core.make_array.call(null, 32);
        var jdx__9308 = hash >>> shift & 31;
        nodes__9307[jdx__9308] = cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit, shift + 5, hash, key, val, added_leaf_QMARK_);
        var i__9309 = 0;
        var j__9310 = 0;
        while(true) {
          if(i__9309 < 32) {
            if((this__9300.bitmap >>> i__9309 & 1) === 0) {
              var G__9363 = i__9309 + 1;
              var G__9364 = j__9310;
              i__9309 = G__9363;
              j__9310 = G__9364;
              continue
            }else {
              nodes__9307[i__9309] = !(this__9300.arr[j__9310] == null) ? cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit, shift + 5, cljs.core.hash.call(null, this__9300.arr[j__9310]), this__9300.arr[j__9310], this__9300.arr[j__9310 + 1], added_leaf_QMARK_) : this__9300.arr[j__9310 + 1];
              var G__9365 = i__9309 + 1;
              var G__9366 = j__9310 + 2;
              i__9309 = G__9365;
              j__9310 = G__9366;
              continue
            }
          }else {
          }
          break
        }
        return new cljs.core.ArrayNode(edit, n__9304 + 1, nodes__9307)
      }else {
        if("\ufdd0'else") {
          var new_arr__9311 = cljs.core.make_array.call(null, 2 * (n__9304 + 4));
          cljs.core.array_copy.call(null, this__9300.arr, 0, new_arr__9311, 0, 2 * idx__9303);
          new_arr__9311[2 * idx__9303] = key;
          new_arr__9311[2 * idx__9303 + 1] = val;
          cljs.core.array_copy.call(null, this__9300.arr, 2 * idx__9303, new_arr__9311, 2 * (idx__9303 + 1), 2 * (n__9304 - idx__9303));
          added_leaf_QMARK_.val = true;
          var editable__9312 = inode__9301.ensure_editable(edit);
          editable__9312.arr = new_arr__9311;
          editable__9312.bitmap = editable__9312.bitmap | bit__9302;
          return editable__9312
        }else {
          return null
        }
      }
    }
  }else {
    var key_or_nil__9313 = this__9300.arr[2 * idx__9303];
    var val_or_node__9314 = this__9300.arr[2 * idx__9303 + 1];
    if(key_or_nil__9313 == null) {
      var n__9315 = val_or_node__9314.inode_assoc_BANG_(edit, shift + 5, hash, key, val, added_leaf_QMARK_);
      if(n__9315 === val_or_node__9314) {
        return inode__9301
      }else {
        return cljs.core.edit_and_set.call(null, inode__9301, edit, 2 * idx__9303 + 1, n__9315)
      }
    }else {
      if(cljs.core.key_test.call(null, key, key_or_nil__9313)) {
        if(val === val_or_node__9314) {
          return inode__9301
        }else {
          return cljs.core.edit_and_set.call(null, inode__9301, edit, 2 * idx__9303 + 1, val)
        }
      }else {
        if("\ufdd0'else") {
          added_leaf_QMARK_.val = true;
          return cljs.core.edit_and_set.call(null, inode__9301, edit, 2 * idx__9303, null, 2 * idx__9303 + 1, cljs.core.create_node.call(null, edit, shift + 5, key_or_nil__9313, val_or_node__9314, hash, key, val))
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_seq = function() {
  var this__9316 = this;
  var inode__9317 = this;
  return cljs.core.create_inode_seq.call(null, this__9316.arr)
};
cljs.core.BitmapIndexedNode.prototype.inode_without_BANG_ = function(edit, shift, hash, key, removed_leaf_QMARK_) {
  var this__9318 = this;
  var inode__9319 = this;
  var bit__9320 = 1 << (hash >>> shift & 31);
  if((this__9318.bitmap & bit__9320) === 0) {
    return inode__9319
  }else {
    var idx__9321 = cljs.core.bitmap_indexed_node_index.call(null, this__9318.bitmap, bit__9320);
    var key_or_nil__9322 = this__9318.arr[2 * idx__9321];
    var val_or_node__9323 = this__9318.arr[2 * idx__9321 + 1];
    if(key_or_nil__9322 == null) {
      var n__9324 = val_or_node__9323.inode_without_BANG_(edit, shift + 5, hash, key, removed_leaf_QMARK_);
      if(n__9324 === val_or_node__9323) {
        return inode__9319
      }else {
        if(!(n__9324 == null)) {
          return cljs.core.edit_and_set.call(null, inode__9319, edit, 2 * idx__9321 + 1, n__9324)
        }else {
          if(this__9318.bitmap === bit__9320) {
            return null
          }else {
            if("\ufdd0'else") {
              return inode__9319.edit_and_remove_pair(edit, bit__9320, idx__9321)
            }else {
              return null
            }
          }
        }
      }
    }else {
      if(cljs.core.key_test.call(null, key, key_or_nil__9322)) {
        removed_leaf_QMARK_[0] = true;
        return inode__9319.edit_and_remove_pair(edit, bit__9320, idx__9321)
      }else {
        if("\ufdd0'else") {
          return inode__9319
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.ensure_editable = function(e) {
  var this__9325 = this;
  var inode__9326 = this;
  if(e === this__9325.edit) {
    return inode__9326
  }else {
    var n__9327 = cljs.core.bit_count.call(null, this__9325.bitmap);
    var new_arr__9328 = cljs.core.make_array.call(null, n__9327 < 0 ? 4 : 2 * (n__9327 + 1));
    cljs.core.array_copy.call(null, this__9325.arr, 0, new_arr__9328, 0, 2 * n__9327);
    return new cljs.core.BitmapIndexedNode(e, this__9325.bitmap, new_arr__9328)
  }
};
cljs.core.BitmapIndexedNode.prototype.kv_reduce = function(f, init) {
  var this__9329 = this;
  var inode__9330 = this;
  return cljs.core.inode_kv_reduce.call(null, this__9329.arr, f, init)
};
cljs.core.BitmapIndexedNode.prototype.inode_find = function(shift, hash, key, not_found) {
  var this__9331 = this;
  var inode__9332 = this;
  var bit__9333 = 1 << (hash >>> shift & 31);
  if((this__9331.bitmap & bit__9333) === 0) {
    return not_found
  }else {
    var idx__9334 = cljs.core.bitmap_indexed_node_index.call(null, this__9331.bitmap, bit__9333);
    var key_or_nil__9335 = this__9331.arr[2 * idx__9334];
    var val_or_node__9336 = this__9331.arr[2 * idx__9334 + 1];
    if(key_or_nil__9335 == null) {
      return val_or_node__9336.inode_find(shift + 5, hash, key, not_found)
    }else {
      if(cljs.core.key_test.call(null, key, key_or_nil__9335)) {
        return cljs.core.PersistentVector.fromArray([key_or_nil__9335, val_or_node__9336], true)
      }else {
        if("\ufdd0'else") {
          return not_found
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_without = function(shift, hash, key) {
  var this__9337 = this;
  var inode__9338 = this;
  var bit__9339 = 1 << (hash >>> shift & 31);
  if((this__9337.bitmap & bit__9339) === 0) {
    return inode__9338
  }else {
    var idx__9340 = cljs.core.bitmap_indexed_node_index.call(null, this__9337.bitmap, bit__9339);
    var key_or_nil__9341 = this__9337.arr[2 * idx__9340];
    var val_or_node__9342 = this__9337.arr[2 * idx__9340 + 1];
    if(key_or_nil__9341 == null) {
      var n__9343 = val_or_node__9342.inode_without(shift + 5, hash, key);
      if(n__9343 === val_or_node__9342) {
        return inode__9338
      }else {
        if(!(n__9343 == null)) {
          return new cljs.core.BitmapIndexedNode(null, this__9337.bitmap, cljs.core.clone_and_set.call(null, this__9337.arr, 2 * idx__9340 + 1, n__9343))
        }else {
          if(this__9337.bitmap === bit__9339) {
            return null
          }else {
            if("\ufdd0'else") {
              return new cljs.core.BitmapIndexedNode(null, this__9337.bitmap ^ bit__9339, cljs.core.remove_pair.call(null, this__9337.arr, idx__9340))
            }else {
              return null
            }
          }
        }
      }
    }else {
      if(cljs.core.key_test.call(null, key, key_or_nil__9341)) {
        return new cljs.core.BitmapIndexedNode(null, this__9337.bitmap ^ bit__9339, cljs.core.remove_pair.call(null, this__9337.arr, idx__9340))
      }else {
        if("\ufdd0'else") {
          return inode__9338
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_assoc = function(shift, hash, key, val, added_leaf_QMARK_) {
  var this__9344 = this;
  var inode__9345 = this;
  var bit__9346 = 1 << (hash >>> shift & 31);
  var idx__9347 = cljs.core.bitmap_indexed_node_index.call(null, this__9344.bitmap, bit__9346);
  if((this__9344.bitmap & bit__9346) === 0) {
    var n__9348 = cljs.core.bit_count.call(null, this__9344.bitmap);
    if(n__9348 >= 16) {
      var nodes__9349 = cljs.core.make_array.call(null, 32);
      var jdx__9350 = hash >>> shift & 31;
      nodes__9349[jdx__9350] = cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_);
      var i__9351 = 0;
      var j__9352 = 0;
      while(true) {
        if(i__9351 < 32) {
          if((this__9344.bitmap >>> i__9351 & 1) === 0) {
            var G__9367 = i__9351 + 1;
            var G__9368 = j__9352;
            i__9351 = G__9367;
            j__9352 = G__9368;
            continue
          }else {
            nodes__9349[i__9351] = !(this__9344.arr[j__9352] == null) ? cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift + 5, cljs.core.hash.call(null, this__9344.arr[j__9352]), this__9344.arr[j__9352], this__9344.arr[j__9352 + 1], added_leaf_QMARK_) : this__9344.arr[j__9352 + 1];
            var G__9369 = i__9351 + 1;
            var G__9370 = j__9352 + 2;
            i__9351 = G__9369;
            j__9352 = G__9370;
            continue
          }
        }else {
        }
        break
      }
      return new cljs.core.ArrayNode(null, n__9348 + 1, nodes__9349)
    }else {
      var new_arr__9353 = cljs.core.make_array.call(null, 2 * (n__9348 + 1));
      cljs.core.array_copy.call(null, this__9344.arr, 0, new_arr__9353, 0, 2 * idx__9347);
      new_arr__9353[2 * idx__9347] = key;
      new_arr__9353[2 * idx__9347 + 1] = val;
      cljs.core.array_copy.call(null, this__9344.arr, 2 * idx__9347, new_arr__9353, 2 * (idx__9347 + 1), 2 * (n__9348 - idx__9347));
      added_leaf_QMARK_.val = true;
      return new cljs.core.BitmapIndexedNode(null, this__9344.bitmap | bit__9346, new_arr__9353)
    }
  }else {
    var key_or_nil__9354 = this__9344.arr[2 * idx__9347];
    var val_or_node__9355 = this__9344.arr[2 * idx__9347 + 1];
    if(key_or_nil__9354 == null) {
      var n__9356 = val_or_node__9355.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_);
      if(n__9356 === val_or_node__9355) {
        return inode__9345
      }else {
        return new cljs.core.BitmapIndexedNode(null, this__9344.bitmap, cljs.core.clone_and_set.call(null, this__9344.arr, 2 * idx__9347 + 1, n__9356))
      }
    }else {
      if(cljs.core.key_test.call(null, key, key_or_nil__9354)) {
        if(val === val_or_node__9355) {
          return inode__9345
        }else {
          return new cljs.core.BitmapIndexedNode(null, this__9344.bitmap, cljs.core.clone_and_set.call(null, this__9344.arr, 2 * idx__9347 + 1, val))
        }
      }else {
        if("\ufdd0'else") {
          added_leaf_QMARK_.val = true;
          return new cljs.core.BitmapIndexedNode(null, this__9344.bitmap, cljs.core.clone_and_set.call(null, this__9344.arr, 2 * idx__9347, null, 2 * idx__9347 + 1, cljs.core.create_node.call(null, shift + 5, key_or_nil__9354, val_or_node__9355, hash, key, val)))
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_lookup = function(shift, hash, key, not_found) {
  var this__9357 = this;
  var inode__9358 = this;
  var bit__9359 = 1 << (hash >>> shift & 31);
  if((this__9357.bitmap & bit__9359) === 0) {
    return not_found
  }else {
    var idx__9360 = cljs.core.bitmap_indexed_node_index.call(null, this__9357.bitmap, bit__9359);
    var key_or_nil__9361 = this__9357.arr[2 * idx__9360];
    var val_or_node__9362 = this__9357.arr[2 * idx__9360 + 1];
    if(key_or_nil__9361 == null) {
      return val_or_node__9362.inode_lookup(shift + 5, hash, key, not_found)
    }else {
      if(cljs.core.key_test.call(null, key, key_or_nil__9361)) {
        return val_or_node__9362
      }else {
        if("\ufdd0'else") {
          return not_found
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode;
cljs.core.BitmapIndexedNode.EMPTY = new cljs.core.BitmapIndexedNode(null, 0, cljs.core.make_array.call(null, 0));
cljs.core.pack_array_node = function pack_array_node(array_node, edit, idx) {
  var arr__9378 = array_node.arr;
  var len__9379 = 2 * (array_node.cnt - 1);
  var new_arr__9380 = cljs.core.make_array.call(null, len__9379);
  var i__9381 = 0;
  var j__9382 = 1;
  var bitmap__9383 = 0;
  while(true) {
    if(i__9381 < len__9379) {
      if(function() {
        var and__3822__auto____9384 = !(i__9381 === idx);
        if(and__3822__auto____9384) {
          return!(arr__9378[i__9381] == null)
        }else {
          return and__3822__auto____9384
        }
      }()) {
        new_arr__9380[j__9382] = arr__9378[i__9381];
        var G__9385 = i__9381 + 1;
        var G__9386 = j__9382 + 2;
        var G__9387 = bitmap__9383 | 1 << i__9381;
        i__9381 = G__9385;
        j__9382 = G__9386;
        bitmap__9383 = G__9387;
        continue
      }else {
        var G__9388 = i__9381 + 1;
        var G__9389 = j__9382;
        var G__9390 = bitmap__9383;
        i__9381 = G__9388;
        j__9382 = G__9389;
        bitmap__9383 = G__9390;
        continue
      }
    }else {
      return new cljs.core.BitmapIndexedNode(edit, bitmap__9383, new_arr__9380)
    }
    break
  }
};
cljs.core.ArrayNode = function(edit, cnt, arr) {
  this.edit = edit;
  this.cnt = cnt;
  this.arr = arr
};
cljs.core.ArrayNode.cljs$lang$type = true;
cljs.core.ArrayNode.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/ArrayNode")
};
cljs.core.ArrayNode.prototype.inode_assoc_BANG_ = function(edit, shift, hash, key, val, added_leaf_QMARK_) {
  var this__9391 = this;
  var inode__9392 = this;
  var idx__9393 = hash >>> shift & 31;
  var node__9394 = this__9391.arr[idx__9393];
  if(node__9394 == null) {
    var editable__9395 = cljs.core.edit_and_set.call(null, inode__9392, edit, idx__9393, cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit, shift + 5, hash, key, val, added_leaf_QMARK_));
    editable__9395.cnt = editable__9395.cnt + 1;
    return editable__9395
  }else {
    var n__9396 = node__9394.inode_assoc_BANG_(edit, shift + 5, hash, key, val, added_leaf_QMARK_);
    if(n__9396 === node__9394) {
      return inode__9392
    }else {
      return cljs.core.edit_and_set.call(null, inode__9392, edit, idx__9393, n__9396)
    }
  }
};
cljs.core.ArrayNode.prototype.inode_seq = function() {
  var this__9397 = this;
  var inode__9398 = this;
  return cljs.core.create_array_node_seq.call(null, this__9397.arr)
};
cljs.core.ArrayNode.prototype.inode_without_BANG_ = function(edit, shift, hash, key, removed_leaf_QMARK_) {
  var this__9399 = this;
  var inode__9400 = this;
  var idx__9401 = hash >>> shift & 31;
  var node__9402 = this__9399.arr[idx__9401];
  if(node__9402 == null) {
    return inode__9400
  }else {
    var n__9403 = node__9402.inode_without_BANG_(edit, shift + 5, hash, key, removed_leaf_QMARK_);
    if(n__9403 === node__9402) {
      return inode__9400
    }else {
      if(n__9403 == null) {
        if(this__9399.cnt <= 8) {
          return cljs.core.pack_array_node.call(null, inode__9400, edit, idx__9401)
        }else {
          var editable__9404 = cljs.core.edit_and_set.call(null, inode__9400, edit, idx__9401, n__9403);
          editable__9404.cnt = editable__9404.cnt - 1;
          return editable__9404
        }
      }else {
        if("\ufdd0'else") {
          return cljs.core.edit_and_set.call(null, inode__9400, edit, idx__9401, n__9403)
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.ArrayNode.prototype.ensure_editable = function(e) {
  var this__9405 = this;
  var inode__9406 = this;
  if(e === this__9405.edit) {
    return inode__9406
  }else {
    return new cljs.core.ArrayNode(e, this__9405.cnt, this__9405.arr.slice())
  }
};
cljs.core.ArrayNode.prototype.kv_reduce = function(f, init) {
  var this__9407 = this;
  var inode__9408 = this;
  var len__9409 = this__9407.arr.length;
  var i__9410 = 0;
  var init__9411 = init;
  while(true) {
    if(i__9410 < len__9409) {
      var node__9412 = this__9407.arr[i__9410];
      if(!(node__9412 == null)) {
        var init__9413 = node__9412.kv_reduce(f, init__9411);
        if(cljs.core.reduced_QMARK_.call(null, init__9413)) {
          return cljs.core.deref.call(null, init__9413)
        }else {
          var G__9432 = i__9410 + 1;
          var G__9433 = init__9413;
          i__9410 = G__9432;
          init__9411 = G__9433;
          continue
        }
      }else {
        return null
      }
    }else {
      return init__9411
    }
    break
  }
};
cljs.core.ArrayNode.prototype.inode_find = function(shift, hash, key, not_found) {
  var this__9414 = this;
  var inode__9415 = this;
  var idx__9416 = hash >>> shift & 31;
  var node__9417 = this__9414.arr[idx__9416];
  if(!(node__9417 == null)) {
    return node__9417.inode_find(shift + 5, hash, key, not_found)
  }else {
    return not_found
  }
};
cljs.core.ArrayNode.prototype.inode_without = function(shift, hash, key) {
  var this__9418 = this;
  var inode__9419 = this;
  var idx__9420 = hash >>> shift & 31;
  var node__9421 = this__9418.arr[idx__9420];
  if(!(node__9421 == null)) {
    var n__9422 = node__9421.inode_without(shift + 5, hash, key);
    if(n__9422 === node__9421) {
      return inode__9419
    }else {
      if(n__9422 == null) {
        if(this__9418.cnt <= 8) {
          return cljs.core.pack_array_node.call(null, inode__9419, null, idx__9420)
        }else {
          return new cljs.core.ArrayNode(null, this__9418.cnt - 1, cljs.core.clone_and_set.call(null, this__9418.arr, idx__9420, n__9422))
        }
      }else {
        if("\ufdd0'else") {
          return new cljs.core.ArrayNode(null, this__9418.cnt, cljs.core.clone_and_set.call(null, this__9418.arr, idx__9420, n__9422))
        }else {
          return null
        }
      }
    }
  }else {
    return inode__9419
  }
};
cljs.core.ArrayNode.prototype.inode_assoc = function(shift, hash, key, val, added_leaf_QMARK_) {
  var this__9423 = this;
  var inode__9424 = this;
  var idx__9425 = hash >>> shift & 31;
  var node__9426 = this__9423.arr[idx__9425];
  if(node__9426 == null) {
    return new cljs.core.ArrayNode(null, this__9423.cnt + 1, cljs.core.clone_and_set.call(null, this__9423.arr, idx__9425, cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_)))
  }else {
    var n__9427 = node__9426.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_);
    if(n__9427 === node__9426) {
      return inode__9424
    }else {
      return new cljs.core.ArrayNode(null, this__9423.cnt, cljs.core.clone_and_set.call(null, this__9423.arr, idx__9425, n__9427))
    }
  }
};
cljs.core.ArrayNode.prototype.inode_lookup = function(shift, hash, key, not_found) {
  var this__9428 = this;
  var inode__9429 = this;
  var idx__9430 = hash >>> shift & 31;
  var node__9431 = this__9428.arr[idx__9430];
  if(!(node__9431 == null)) {
    return node__9431.inode_lookup(shift + 5, hash, key, not_found)
  }else {
    return not_found
  }
};
cljs.core.ArrayNode;
cljs.core.hash_collision_node_find_index = function hash_collision_node_find_index(arr, cnt, key) {
  var lim__9436 = 2 * cnt;
  var i__9437 = 0;
  while(true) {
    if(i__9437 < lim__9436) {
      if(cljs.core.key_test.call(null, key, arr[i__9437])) {
        return i__9437
      }else {
        var G__9438 = i__9437 + 2;
        i__9437 = G__9438;
        continue
      }
    }else {
      return-1
    }
    break
  }
};
cljs.core.HashCollisionNode = function(edit, collision_hash, cnt, arr) {
  this.edit = edit;
  this.collision_hash = collision_hash;
  this.cnt = cnt;
  this.arr = arr
};
cljs.core.HashCollisionNode.cljs$lang$type = true;
cljs.core.HashCollisionNode.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/HashCollisionNode")
};
cljs.core.HashCollisionNode.prototype.inode_assoc_BANG_ = function(edit, shift, hash, key, val, added_leaf_QMARK_) {
  var this__9439 = this;
  var inode__9440 = this;
  if(hash === this__9439.collision_hash) {
    var idx__9441 = cljs.core.hash_collision_node_find_index.call(null, this__9439.arr, this__9439.cnt, key);
    if(idx__9441 === -1) {
      if(this__9439.arr.length > 2 * this__9439.cnt) {
        var editable__9442 = cljs.core.edit_and_set.call(null, inode__9440, edit, 2 * this__9439.cnt, key, 2 * this__9439.cnt + 1, val);
        added_leaf_QMARK_.val = true;
        editable__9442.cnt = editable__9442.cnt + 1;
        return editable__9442
      }else {
        var len__9443 = this__9439.arr.length;
        var new_arr__9444 = cljs.core.make_array.call(null, len__9443 + 2);
        cljs.core.array_copy.call(null, this__9439.arr, 0, new_arr__9444, 0, len__9443);
        new_arr__9444[len__9443] = key;
        new_arr__9444[len__9443 + 1] = val;
        added_leaf_QMARK_.val = true;
        return inode__9440.ensure_editable_array(edit, this__9439.cnt + 1, new_arr__9444)
      }
    }else {
      if(this__9439.arr[idx__9441 + 1] === val) {
        return inode__9440
      }else {
        return cljs.core.edit_and_set.call(null, inode__9440, edit, idx__9441 + 1, val)
      }
    }
  }else {
    return(new cljs.core.BitmapIndexedNode(edit, 1 << (this__9439.collision_hash >>> shift & 31), [null, inode__9440, null, null])).inode_assoc_BANG_(edit, shift, hash, key, val, added_leaf_QMARK_)
  }
};
cljs.core.HashCollisionNode.prototype.inode_seq = function() {
  var this__9445 = this;
  var inode__9446 = this;
  return cljs.core.create_inode_seq.call(null, this__9445.arr)
};
cljs.core.HashCollisionNode.prototype.inode_without_BANG_ = function(edit, shift, hash, key, removed_leaf_QMARK_) {
  var this__9447 = this;
  var inode__9448 = this;
  var idx__9449 = cljs.core.hash_collision_node_find_index.call(null, this__9447.arr, this__9447.cnt, key);
  if(idx__9449 === -1) {
    return inode__9448
  }else {
    removed_leaf_QMARK_[0] = true;
    if(this__9447.cnt === 1) {
      return null
    }else {
      var editable__9450 = inode__9448.ensure_editable(edit);
      var earr__9451 = editable__9450.arr;
      earr__9451[idx__9449] = earr__9451[2 * this__9447.cnt - 2];
      earr__9451[idx__9449 + 1] = earr__9451[2 * this__9447.cnt - 1];
      earr__9451[2 * this__9447.cnt - 1] = null;
      earr__9451[2 * this__9447.cnt - 2] = null;
      editable__9450.cnt = editable__9450.cnt - 1;
      return editable__9450
    }
  }
};
cljs.core.HashCollisionNode.prototype.ensure_editable = function(e) {
  var this__9452 = this;
  var inode__9453 = this;
  if(e === this__9452.edit) {
    return inode__9453
  }else {
    var new_arr__9454 = cljs.core.make_array.call(null, 2 * (this__9452.cnt + 1));
    cljs.core.array_copy.call(null, this__9452.arr, 0, new_arr__9454, 0, 2 * this__9452.cnt);
    return new cljs.core.HashCollisionNode(e, this__9452.collision_hash, this__9452.cnt, new_arr__9454)
  }
};
cljs.core.HashCollisionNode.prototype.kv_reduce = function(f, init) {
  var this__9455 = this;
  var inode__9456 = this;
  return cljs.core.inode_kv_reduce.call(null, this__9455.arr, f, init)
};
cljs.core.HashCollisionNode.prototype.inode_find = function(shift, hash, key, not_found) {
  var this__9457 = this;
  var inode__9458 = this;
  var idx__9459 = cljs.core.hash_collision_node_find_index.call(null, this__9457.arr, this__9457.cnt, key);
  if(idx__9459 < 0) {
    return not_found
  }else {
    if(cljs.core.key_test.call(null, key, this__9457.arr[idx__9459])) {
      return cljs.core.PersistentVector.fromArray([this__9457.arr[idx__9459], this__9457.arr[idx__9459 + 1]], true)
    }else {
      if("\ufdd0'else") {
        return not_found
      }else {
        return null
      }
    }
  }
};
cljs.core.HashCollisionNode.prototype.inode_without = function(shift, hash, key) {
  var this__9460 = this;
  var inode__9461 = this;
  var idx__9462 = cljs.core.hash_collision_node_find_index.call(null, this__9460.arr, this__9460.cnt, key);
  if(idx__9462 === -1) {
    return inode__9461
  }else {
    if(this__9460.cnt === 1) {
      return null
    }else {
      if("\ufdd0'else") {
        return new cljs.core.HashCollisionNode(null, this__9460.collision_hash, this__9460.cnt - 1, cljs.core.remove_pair.call(null, this__9460.arr, cljs.core.quot.call(null, idx__9462, 2)))
      }else {
        return null
      }
    }
  }
};
cljs.core.HashCollisionNode.prototype.inode_assoc = function(shift, hash, key, val, added_leaf_QMARK_) {
  var this__9463 = this;
  var inode__9464 = this;
  if(hash === this__9463.collision_hash) {
    var idx__9465 = cljs.core.hash_collision_node_find_index.call(null, this__9463.arr, this__9463.cnt, key);
    if(idx__9465 === -1) {
      var len__9466 = this__9463.arr.length;
      var new_arr__9467 = cljs.core.make_array.call(null, len__9466 + 2);
      cljs.core.array_copy.call(null, this__9463.arr, 0, new_arr__9467, 0, len__9466);
      new_arr__9467[len__9466] = key;
      new_arr__9467[len__9466 + 1] = val;
      added_leaf_QMARK_.val = true;
      return new cljs.core.HashCollisionNode(null, this__9463.collision_hash, this__9463.cnt + 1, new_arr__9467)
    }else {
      if(cljs.core._EQ_.call(null, this__9463.arr[idx__9465], val)) {
        return inode__9464
      }else {
        return new cljs.core.HashCollisionNode(null, this__9463.collision_hash, this__9463.cnt, cljs.core.clone_and_set.call(null, this__9463.arr, idx__9465 + 1, val))
      }
    }
  }else {
    return(new cljs.core.BitmapIndexedNode(null, 1 << (this__9463.collision_hash >>> shift & 31), [null, inode__9464])).inode_assoc(shift, hash, key, val, added_leaf_QMARK_)
  }
};
cljs.core.HashCollisionNode.prototype.inode_lookup = function(shift, hash, key, not_found) {
  var this__9468 = this;
  var inode__9469 = this;
  var idx__9470 = cljs.core.hash_collision_node_find_index.call(null, this__9468.arr, this__9468.cnt, key);
  if(idx__9470 < 0) {
    return not_found
  }else {
    if(cljs.core.key_test.call(null, key, this__9468.arr[idx__9470])) {
      return this__9468.arr[idx__9470 + 1]
    }else {
      if("\ufdd0'else") {
        return not_found
      }else {
        return null
      }
    }
  }
};
cljs.core.HashCollisionNode.prototype.ensure_editable_array = function(e, count, array) {
  var this__9471 = this;
  var inode__9472 = this;
  if(e === this__9471.edit) {
    this__9471.arr = array;
    this__9471.cnt = count;
    return inode__9472
  }else {
    return new cljs.core.HashCollisionNode(this__9471.edit, this__9471.collision_hash, count, array)
  }
};
cljs.core.HashCollisionNode;
cljs.core.create_node = function() {
  var create_node = null;
  var create_node__6 = function(shift, key1, val1, key2hash, key2, val2) {
    var key1hash__9477 = cljs.core.hash.call(null, key1);
    if(key1hash__9477 === key2hash) {
      return new cljs.core.HashCollisionNode(null, key1hash__9477, 2, [key1, val1, key2, val2])
    }else {
      var added_leaf_QMARK___9478 = new cljs.core.Box(false);
      return cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift, key1hash__9477, key1, val1, added_leaf_QMARK___9478).inode_assoc(shift, key2hash, key2, val2, added_leaf_QMARK___9478)
    }
  };
  var create_node__7 = function(edit, shift, key1, val1, key2hash, key2, val2) {
    var key1hash__9479 = cljs.core.hash.call(null, key1);
    if(key1hash__9479 === key2hash) {
      return new cljs.core.HashCollisionNode(null, key1hash__9479, 2, [key1, val1, key2, val2])
    }else {
      var added_leaf_QMARK___9480 = new cljs.core.Box(false);
      return cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit, shift, key1hash__9479, key1, val1, added_leaf_QMARK___9480).inode_assoc_BANG_(edit, shift, key2hash, key2, val2, added_leaf_QMARK___9480)
    }
  };
  create_node = function(edit, shift, key1, val1, key2hash, key2, val2) {
    switch(arguments.length) {
      case 6:
        return create_node__6.call(this, edit, shift, key1, val1, key2hash, key2);
      case 7:
        return create_node__7.call(this, edit, shift, key1, val1, key2hash, key2, val2)
    }
    throw"Invalid arity: " + arguments.length;
  };
  create_node.cljs$lang$arity$6 = create_node__6;
  create_node.cljs$lang$arity$7 = create_node__7;
  return create_node
}();
cljs.core.NodeSeq = function(meta, nodes, i, s, __hash) {
  this.meta = meta;
  this.nodes = nodes;
  this.i = i;
  this.s = s;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31850572
};
cljs.core.NodeSeq.cljs$lang$type = true;
cljs.core.NodeSeq.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/NodeSeq")
};
cljs.core.NodeSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9481 = this;
  var h__2188__auto____9482 = this__9481.__hash;
  if(!(h__2188__auto____9482 == null)) {
    return h__2188__auto____9482
  }else {
    var h__2188__auto____9483 = cljs.core.hash_coll.call(null, coll);
    this__9481.__hash = h__2188__auto____9483;
    return h__2188__auto____9483
  }
};
cljs.core.NodeSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__9484 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.NodeSeq.prototype.toString = function() {
  var this__9485 = this;
  var this__9486 = this;
  return cljs.core.pr_str.call(null, this__9486)
};
cljs.core.NodeSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var this__9487 = this;
  return this$
};
cljs.core.NodeSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__9488 = this;
  if(this__9488.s == null) {
    return cljs.core.PersistentVector.fromArray([this__9488.nodes[this__9488.i], this__9488.nodes[this__9488.i + 1]], true)
  }else {
    return cljs.core.first.call(null, this__9488.s)
  }
};
cljs.core.NodeSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__9489 = this;
  if(this__9489.s == null) {
    return cljs.core.create_inode_seq.call(null, this__9489.nodes, this__9489.i + 2, null)
  }else {
    return cljs.core.create_inode_seq.call(null, this__9489.nodes, this__9489.i, cljs.core.next.call(null, this__9489.s))
  }
};
cljs.core.NodeSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9490 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.NodeSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9491 = this;
  return new cljs.core.NodeSeq(meta, this__9491.nodes, this__9491.i, this__9491.s, this__9491.__hash)
};
cljs.core.NodeSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9492 = this;
  return this__9492.meta
};
cljs.core.NodeSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9493 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__9493.meta)
};
cljs.core.NodeSeq;
cljs.core.create_inode_seq = function() {
  var create_inode_seq = null;
  var create_inode_seq__1 = function(nodes) {
    return create_inode_seq.call(null, nodes, 0, null)
  };
  var create_inode_seq__3 = function(nodes, i, s) {
    if(s == null) {
      var len__9500 = nodes.length;
      var j__9501 = i;
      while(true) {
        if(j__9501 < len__9500) {
          if(!(nodes[j__9501] == null)) {
            return new cljs.core.NodeSeq(null, nodes, j__9501, null, null)
          }else {
            var temp__3971__auto____9502 = nodes[j__9501 + 1];
            if(cljs.core.truth_(temp__3971__auto____9502)) {
              var node__9503 = temp__3971__auto____9502;
              var temp__3971__auto____9504 = node__9503.inode_seq();
              if(cljs.core.truth_(temp__3971__auto____9504)) {
                var node_seq__9505 = temp__3971__auto____9504;
                return new cljs.core.NodeSeq(null, nodes, j__9501 + 2, node_seq__9505, null)
              }else {
                var G__9506 = j__9501 + 2;
                j__9501 = G__9506;
                continue
              }
            }else {
              var G__9507 = j__9501 + 2;
              j__9501 = G__9507;
              continue
            }
          }
        }else {
          return null
        }
        break
      }
    }else {
      return new cljs.core.NodeSeq(null, nodes, i, s, null)
    }
  };
  create_inode_seq = function(nodes, i, s) {
    switch(arguments.length) {
      case 1:
        return create_inode_seq__1.call(this, nodes);
      case 3:
        return create_inode_seq__3.call(this, nodes, i, s)
    }
    throw"Invalid arity: " + arguments.length;
  };
  create_inode_seq.cljs$lang$arity$1 = create_inode_seq__1;
  create_inode_seq.cljs$lang$arity$3 = create_inode_seq__3;
  return create_inode_seq
}();
cljs.core.ArrayNodeSeq = function(meta, nodes, i, s, __hash) {
  this.meta = meta;
  this.nodes = nodes;
  this.i = i;
  this.s = s;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31850572
};
cljs.core.ArrayNodeSeq.cljs$lang$type = true;
cljs.core.ArrayNodeSeq.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/ArrayNodeSeq")
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9508 = this;
  var h__2188__auto____9509 = this__9508.__hash;
  if(!(h__2188__auto____9509 == null)) {
    return h__2188__auto____9509
  }else {
    var h__2188__auto____9510 = cljs.core.hash_coll.call(null, coll);
    this__9508.__hash = h__2188__auto____9510;
    return h__2188__auto____9510
  }
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__9511 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.ArrayNodeSeq.prototype.toString = function() {
  var this__9512 = this;
  var this__9513 = this;
  return cljs.core.pr_str.call(null, this__9513)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var this__9514 = this;
  return this$
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__9515 = this;
  return cljs.core.first.call(null, this__9515.s)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__9516 = this;
  return cljs.core.create_array_node_seq.call(null, null, this__9516.nodes, this__9516.i, cljs.core.next.call(null, this__9516.s))
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9517 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9518 = this;
  return new cljs.core.ArrayNodeSeq(meta, this__9518.nodes, this__9518.i, this__9518.s, this__9518.__hash)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9519 = this;
  return this__9519.meta
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9520 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__9520.meta)
};
cljs.core.ArrayNodeSeq;
cljs.core.create_array_node_seq = function() {
  var create_array_node_seq = null;
  var create_array_node_seq__1 = function(nodes) {
    return create_array_node_seq.call(null, null, nodes, 0, null)
  };
  var create_array_node_seq__4 = function(meta, nodes, i, s) {
    if(s == null) {
      var len__9527 = nodes.length;
      var j__9528 = i;
      while(true) {
        if(j__9528 < len__9527) {
          var temp__3971__auto____9529 = nodes[j__9528];
          if(cljs.core.truth_(temp__3971__auto____9529)) {
            var nj__9530 = temp__3971__auto____9529;
            var temp__3971__auto____9531 = nj__9530.inode_seq();
            if(cljs.core.truth_(temp__3971__auto____9531)) {
              var ns__9532 = temp__3971__auto____9531;
              return new cljs.core.ArrayNodeSeq(meta, nodes, j__9528 + 1, ns__9532, null)
            }else {
              var G__9533 = j__9528 + 1;
              j__9528 = G__9533;
              continue
            }
          }else {
            var G__9534 = j__9528 + 1;
            j__9528 = G__9534;
            continue
          }
        }else {
          return null
        }
        break
      }
    }else {
      return new cljs.core.ArrayNodeSeq(meta, nodes, i, s, null)
    }
  };
  create_array_node_seq = function(meta, nodes, i, s) {
    switch(arguments.length) {
      case 1:
        return create_array_node_seq__1.call(this, meta);
      case 4:
        return create_array_node_seq__4.call(this, meta, nodes, i, s)
    }
    throw"Invalid arity: " + arguments.length;
  };
  create_array_node_seq.cljs$lang$arity$1 = create_array_node_seq__1;
  create_array_node_seq.cljs$lang$arity$4 = create_array_node_seq__4;
  return create_array_node_seq
}();
cljs.core.PersistentHashMap = function(meta, cnt, root, has_nil_QMARK_, nil_val, __hash) {
  this.meta = meta;
  this.cnt = cnt;
  this.root = root;
  this.has_nil_QMARK_ = has_nil_QMARK_;
  this.nil_val = nil_val;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 1;
  this.cljs$lang$protocol_mask$partition0$ = 16123663
};
cljs.core.PersistentHashMap.cljs$lang$type = true;
cljs.core.PersistentHashMap.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentHashMap")
};
cljs.core.PersistentHashMap.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var this__9537 = this;
  return new cljs.core.TransientHashMap({}, this__9537.root, this__9537.cnt, this__9537.has_nil_QMARK_, this__9537.nil_val)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9538 = this;
  var h__2188__auto____9539 = this__9538.__hash;
  if(!(h__2188__auto____9539 == null)) {
    return h__2188__auto____9539
  }else {
    var h__2188__auto____9540 = cljs.core.hash_imap.call(null, coll);
    this__9538.__hash = h__2188__auto____9540;
    return h__2188__auto____9540
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__9541 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, k, null)
};
cljs.core.PersistentHashMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__9542 = this;
  if(k == null) {
    if(this__9542.has_nil_QMARK_) {
      return this__9542.nil_val
    }else {
      return not_found
    }
  }else {
    if(this__9542.root == null) {
      return not_found
    }else {
      if("\ufdd0'else") {
        return this__9542.root.inode_lookup(0, cljs.core.hash.call(null, k), k, not_found)
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__9543 = this;
  if(k == null) {
    if(function() {
      var and__3822__auto____9544 = this__9543.has_nil_QMARK_;
      if(and__3822__auto____9544) {
        return v === this__9543.nil_val
      }else {
        return and__3822__auto____9544
      }
    }()) {
      return coll
    }else {
      return new cljs.core.PersistentHashMap(this__9543.meta, this__9543.has_nil_QMARK_ ? this__9543.cnt : this__9543.cnt + 1, this__9543.root, true, v, null)
    }
  }else {
    var added_leaf_QMARK___9545 = new cljs.core.Box(false);
    var new_root__9546 = (this__9543.root == null ? cljs.core.BitmapIndexedNode.EMPTY : this__9543.root).inode_assoc(0, cljs.core.hash.call(null, k), k, v, added_leaf_QMARK___9545);
    if(new_root__9546 === this__9543.root) {
      return coll
    }else {
      return new cljs.core.PersistentHashMap(this__9543.meta, added_leaf_QMARK___9545.val ? this__9543.cnt + 1 : this__9543.cnt, new_root__9546, this__9543.has_nil_QMARK_, this__9543.nil_val, null)
    }
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__9547 = this;
  if(k == null) {
    return this__9547.has_nil_QMARK_
  }else {
    if(this__9547.root == null) {
      return false
    }else {
      if("\ufdd0'else") {
        return!(this__9547.root.inode_lookup(0, cljs.core.hash.call(null, k), k, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel)
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentHashMap.prototype.call = function() {
  var G__9570 = null;
  var G__9570__2 = function(this_sym9548, k) {
    var this__9550 = this;
    var this_sym9548__9551 = this;
    var coll__9552 = this_sym9548__9551;
    return coll__9552.cljs$core$ILookup$_lookup$arity$2(coll__9552, k)
  };
  var G__9570__3 = function(this_sym9549, k, not_found) {
    var this__9550 = this;
    var this_sym9549__9553 = this;
    var coll__9554 = this_sym9549__9553;
    return coll__9554.cljs$core$ILookup$_lookup$arity$3(coll__9554, k, not_found)
  };
  G__9570 = function(this_sym9549, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9570__2.call(this, this_sym9549, k);
      case 3:
        return G__9570__3.call(this, this_sym9549, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9570
}();
cljs.core.PersistentHashMap.prototype.apply = function(this_sym9535, args9536) {
  var this__9555 = this;
  return this_sym9535.call.apply(this_sym9535, [this_sym9535].concat(args9536.slice()))
};
cljs.core.PersistentHashMap.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = function(coll, f, init) {
  var this__9556 = this;
  var init__9557 = this__9556.has_nil_QMARK_ ? f.call(null, init, null, this__9556.nil_val) : init;
  if(cljs.core.reduced_QMARK_.call(null, init__9557)) {
    return cljs.core.deref.call(null, init__9557)
  }else {
    if(!(this__9556.root == null)) {
      return this__9556.root.kv_reduce(f, init__9557)
    }else {
      if("\ufdd0'else") {
        return init__9557
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__9558 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.PersistentHashMap.prototype.toString = function() {
  var this__9559 = this;
  var this__9560 = this;
  return cljs.core.pr_str.call(null, this__9560)
};
cljs.core.PersistentHashMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__9561 = this;
  if(this__9561.cnt > 0) {
    var s__9562 = !(this__9561.root == null) ? this__9561.root.inode_seq() : null;
    if(this__9561.has_nil_QMARK_) {
      return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([null, this__9561.nil_val], true), s__9562)
    }else {
      return s__9562
    }
  }else {
    return null
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9563 = this;
  return this__9563.cnt
};
cljs.core.PersistentHashMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9564 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9565 = this;
  return new cljs.core.PersistentHashMap(meta, this__9565.cnt, this__9565.root, this__9565.has_nil_QMARK_, this__9565.nil_val, this__9565.__hash)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9566 = this;
  return this__9566.meta
};
cljs.core.PersistentHashMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9567 = this;
  return cljs.core._with_meta.call(null, cljs.core.PersistentHashMap.EMPTY, this__9567.meta)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__9568 = this;
  if(k == null) {
    if(this__9568.has_nil_QMARK_) {
      return new cljs.core.PersistentHashMap(this__9568.meta, this__9568.cnt - 1, this__9568.root, false, null, null)
    }else {
      return coll
    }
  }else {
    if(this__9568.root == null) {
      return coll
    }else {
      if("\ufdd0'else") {
        var new_root__9569 = this__9568.root.inode_without(0, cljs.core.hash.call(null, k), k);
        if(new_root__9569 === this__9568.root) {
          return coll
        }else {
          return new cljs.core.PersistentHashMap(this__9568.meta, this__9568.cnt - 1, new_root__9569, this__9568.has_nil_QMARK_, this__9568.nil_val, null)
        }
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentHashMap;
cljs.core.PersistentHashMap.EMPTY = new cljs.core.PersistentHashMap(null, 0, null, false, null, 0);
cljs.core.PersistentHashMap.fromArrays = function(ks, vs) {
  var len__9571 = ks.length;
  var i__9572 = 0;
  var out__9573 = cljs.core.transient$.call(null, cljs.core.PersistentHashMap.EMPTY);
  while(true) {
    if(i__9572 < len__9571) {
      var G__9574 = i__9572 + 1;
      var G__9575 = cljs.core.assoc_BANG_.call(null, out__9573, ks[i__9572], vs[i__9572]);
      i__9572 = G__9574;
      out__9573 = G__9575;
      continue
    }else {
      return cljs.core.persistent_BANG_.call(null, out__9573)
    }
    break
  }
};
cljs.core.TransientHashMap = function(edit, root, count, has_nil_QMARK_, nil_val) {
  this.edit = edit;
  this.root = root;
  this.count = count;
  this.has_nil_QMARK_ = has_nil_QMARK_;
  this.nil_val = nil_val;
  this.cljs$lang$protocol_mask$partition1$ = 14;
  this.cljs$lang$protocol_mask$partition0$ = 258
};
cljs.core.TransientHashMap.cljs$lang$type = true;
cljs.core.TransientHashMap.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/TransientHashMap")
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientMap$_dissoc_BANG_$arity$2 = function(tcoll, key) {
  var this__9576 = this;
  return tcoll.without_BANG_(key)
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3 = function(tcoll, key, val) {
  var this__9577 = this;
  return tcoll.assoc_BANG_(key, val)
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientCollection$_conj_BANG_$arity$2 = function(tcoll, val) {
  var this__9578 = this;
  return tcoll.conj_BANG_(val)
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientCollection$_persistent_BANG_$arity$1 = function(tcoll) {
  var this__9579 = this;
  return tcoll.persistent_BANG_()
};
cljs.core.TransientHashMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(tcoll, k) {
  var this__9580 = this;
  if(k == null) {
    if(this__9580.has_nil_QMARK_) {
      return this__9580.nil_val
    }else {
      return null
    }
  }else {
    if(this__9580.root == null) {
      return null
    }else {
      return this__9580.root.inode_lookup(0, cljs.core.hash.call(null, k), k)
    }
  }
};
cljs.core.TransientHashMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(tcoll, k, not_found) {
  var this__9581 = this;
  if(k == null) {
    if(this__9581.has_nil_QMARK_) {
      return this__9581.nil_val
    }else {
      return not_found
    }
  }else {
    if(this__9581.root == null) {
      return not_found
    }else {
      return this__9581.root.inode_lookup(0, cljs.core.hash.call(null, k), k, not_found)
    }
  }
};
cljs.core.TransientHashMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9582 = this;
  if(this__9582.edit) {
    return this__9582.count
  }else {
    throw new Error("count after persistent!");
  }
};
cljs.core.TransientHashMap.prototype.conj_BANG_ = function(o) {
  var this__9583 = this;
  var tcoll__9584 = this;
  if(this__9583.edit) {
    if(function() {
      var G__9585__9586 = o;
      if(G__9585__9586) {
        if(function() {
          var or__3824__auto____9587 = G__9585__9586.cljs$lang$protocol_mask$partition0$ & 2048;
          if(or__3824__auto____9587) {
            return or__3824__auto____9587
          }else {
            return G__9585__9586.cljs$core$IMapEntry$
          }
        }()) {
          return true
        }else {
          if(!G__9585__9586.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.IMapEntry, G__9585__9586)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.IMapEntry, G__9585__9586)
      }
    }()) {
      return tcoll__9584.assoc_BANG_(cljs.core.key.call(null, o), cljs.core.val.call(null, o))
    }else {
      var es__9588 = cljs.core.seq.call(null, o);
      var tcoll__9589 = tcoll__9584;
      while(true) {
        var temp__3971__auto____9590 = cljs.core.first.call(null, es__9588);
        if(cljs.core.truth_(temp__3971__auto____9590)) {
          var e__9591 = temp__3971__auto____9590;
          var G__9602 = cljs.core.next.call(null, es__9588);
          var G__9603 = tcoll__9589.assoc_BANG_(cljs.core.key.call(null, e__9591), cljs.core.val.call(null, e__9591));
          es__9588 = G__9602;
          tcoll__9589 = G__9603;
          continue
        }else {
          return tcoll__9589
        }
        break
      }
    }
  }else {
    throw new Error("conj! after persistent");
  }
};
cljs.core.TransientHashMap.prototype.assoc_BANG_ = function(k, v) {
  var this__9592 = this;
  var tcoll__9593 = this;
  if(this__9592.edit) {
    if(k == null) {
      if(this__9592.nil_val === v) {
      }else {
        this__9592.nil_val = v
      }
      if(this__9592.has_nil_QMARK_) {
      }else {
        this__9592.count = this__9592.count + 1;
        this__9592.has_nil_QMARK_ = true
      }
      return tcoll__9593
    }else {
      var added_leaf_QMARK___9594 = new cljs.core.Box(false);
      var node__9595 = (this__9592.root == null ? cljs.core.BitmapIndexedNode.EMPTY : this__9592.root).inode_assoc_BANG_(this__9592.edit, 0, cljs.core.hash.call(null, k), k, v, added_leaf_QMARK___9594);
      if(node__9595 === this__9592.root) {
      }else {
        this__9592.root = node__9595
      }
      if(added_leaf_QMARK___9594.val) {
        this__9592.count = this__9592.count + 1
      }else {
      }
      return tcoll__9593
    }
  }else {
    throw new Error("assoc! after persistent!");
  }
};
cljs.core.TransientHashMap.prototype.without_BANG_ = function(k) {
  var this__9596 = this;
  var tcoll__9597 = this;
  if(this__9596.edit) {
    if(k == null) {
      if(this__9596.has_nil_QMARK_) {
        this__9596.has_nil_QMARK_ = false;
        this__9596.nil_val = null;
        this__9596.count = this__9596.count - 1;
        return tcoll__9597
      }else {
        return tcoll__9597
      }
    }else {
      if(this__9596.root == null) {
        return tcoll__9597
      }else {
        var removed_leaf_QMARK___9598 = new cljs.core.Box(false);
        var node__9599 = this__9596.root.inode_without_BANG_(this__9596.edit, 0, cljs.core.hash.call(null, k), k, removed_leaf_QMARK___9598);
        if(node__9599 === this__9596.root) {
        }else {
          this__9596.root = node__9599
        }
        if(cljs.core.truth_(removed_leaf_QMARK___9598[0])) {
          this__9596.count = this__9596.count - 1
        }else {
        }
        return tcoll__9597
      }
    }
  }else {
    throw new Error("dissoc! after persistent!");
  }
};
cljs.core.TransientHashMap.prototype.persistent_BANG_ = function() {
  var this__9600 = this;
  var tcoll__9601 = this;
  if(this__9600.edit) {
    this__9600.edit = null;
    return new cljs.core.PersistentHashMap(null, this__9600.count, this__9600.root, this__9600.has_nil_QMARK_, this__9600.nil_val, null)
  }else {
    throw new Error("persistent! called twice");
  }
};
cljs.core.TransientHashMap;
cljs.core.tree_map_seq_push = function tree_map_seq_push(node, stack, ascending_QMARK_) {
  var t__9606 = node;
  var stack__9607 = stack;
  while(true) {
    if(!(t__9606 == null)) {
      var G__9608 = ascending_QMARK_ ? t__9606.left : t__9606.right;
      var G__9609 = cljs.core.conj.call(null, stack__9607, t__9606);
      t__9606 = G__9608;
      stack__9607 = G__9609;
      continue
    }else {
      return stack__9607
    }
    break
  }
};
cljs.core.PersistentTreeMapSeq = function(meta, stack, ascending_QMARK_, cnt, __hash) {
  this.meta = meta;
  this.stack = stack;
  this.ascending_QMARK_ = ascending_QMARK_;
  this.cnt = cnt;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31850570
};
cljs.core.PersistentTreeMapSeq.cljs$lang$type = true;
cljs.core.PersistentTreeMapSeq.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentTreeMapSeq")
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9610 = this;
  var h__2188__auto____9611 = this__9610.__hash;
  if(!(h__2188__auto____9611 == null)) {
    return h__2188__auto____9611
  }else {
    var h__2188__auto____9612 = cljs.core.hash_coll.call(null, coll);
    this__9610.__hash = h__2188__auto____9612;
    return h__2188__auto____9612
  }
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__9613 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.PersistentTreeMapSeq.prototype.toString = function() {
  var this__9614 = this;
  var this__9615 = this;
  return cljs.core.pr_str.call(null, this__9615)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var this__9616 = this;
  return this$
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9617 = this;
  if(this__9617.cnt < 0) {
    return cljs.core.count.call(null, cljs.core.next.call(null, coll)) + 1
  }else {
    return this__9617.cnt
  }
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(this$) {
  var this__9618 = this;
  return cljs.core.peek.call(null, this__9618.stack)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(this$) {
  var this__9619 = this;
  var t__9620 = cljs.core.first.call(null, this__9619.stack);
  var next_stack__9621 = cljs.core.tree_map_seq_push.call(null, this__9619.ascending_QMARK_ ? t__9620.right : t__9620.left, cljs.core.next.call(null, this__9619.stack), this__9619.ascending_QMARK_);
  if(!(next_stack__9621 == null)) {
    return new cljs.core.PersistentTreeMapSeq(null, next_stack__9621, this__9619.ascending_QMARK_, this__9619.cnt - 1, null)
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9622 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9623 = this;
  return new cljs.core.PersistentTreeMapSeq(meta, this__9623.stack, this__9623.ascending_QMARK_, this__9623.cnt, this__9623.__hash)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9624 = this;
  return this__9624.meta
};
cljs.core.PersistentTreeMapSeq;
cljs.core.create_tree_map_seq = function create_tree_map_seq(tree, ascending_QMARK_, cnt) {
  return new cljs.core.PersistentTreeMapSeq(null, cljs.core.tree_map_seq_push.call(null, tree, null, ascending_QMARK_), ascending_QMARK_, cnt, null)
};
cljs.core.balance_left = function balance_left(key, val, ins, right) {
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins)) {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins.left)) {
      return new cljs.core.RedNode(ins.key, ins.val, ins.left.blacken(), new cljs.core.BlackNode(key, val, ins.right, right, null), null)
    }else {
      if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins.right)) {
        return new cljs.core.RedNode(ins.right.key, ins.right.val, new cljs.core.BlackNode(ins.key, ins.val, ins.left, ins.right.left, null), new cljs.core.BlackNode(key, val, ins.right.right, right, null), null)
      }else {
        if("\ufdd0'else") {
          return new cljs.core.BlackNode(key, val, ins, right, null)
        }else {
          return null
        }
      }
    }
  }else {
    return new cljs.core.BlackNode(key, val, ins, right, null)
  }
};
cljs.core.balance_right = function balance_right(key, val, left, ins) {
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins)) {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins.right)) {
      return new cljs.core.RedNode(ins.key, ins.val, new cljs.core.BlackNode(key, val, left, ins.left, null), ins.right.blacken(), null)
    }else {
      if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins.left)) {
        return new cljs.core.RedNode(ins.left.key, ins.left.val, new cljs.core.BlackNode(key, val, left, ins.left.left, null), new cljs.core.BlackNode(ins.key, ins.val, ins.left.right, ins.right, null), null)
      }else {
        if("\ufdd0'else") {
          return new cljs.core.BlackNode(key, val, left, ins, null)
        }else {
          return null
        }
      }
    }
  }else {
    return new cljs.core.BlackNode(key, val, left, ins, null)
  }
};
cljs.core.balance_left_del = function balance_left_del(key, val, del, right) {
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, del)) {
    return new cljs.core.RedNode(key, val, del.blacken(), right, null)
  }else {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, right)) {
      return cljs.core.balance_right.call(null, key, val, del, right.redden())
    }else {
      if(function() {
        var and__3822__auto____9626 = cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, right);
        if(and__3822__auto____9626) {
          return cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, right.left)
        }else {
          return and__3822__auto____9626
        }
      }()) {
        return new cljs.core.RedNode(right.left.key, right.left.val, new cljs.core.BlackNode(key, val, del, right.left.left, null), cljs.core.balance_right.call(null, right.key, right.val, right.left.right, right.right.redden()), null)
      }else {
        if("\ufdd0'else") {
          throw new Error("red-black tree invariant violation");
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.balance_right_del = function balance_right_del(key, val, left, del) {
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, del)) {
    return new cljs.core.RedNode(key, val, left, del.blacken(), null)
  }else {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, left)) {
      return cljs.core.balance_left.call(null, key, val, left.redden(), del)
    }else {
      if(function() {
        var and__3822__auto____9628 = cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, left);
        if(and__3822__auto____9628) {
          return cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, left.right)
        }else {
          return and__3822__auto____9628
        }
      }()) {
        return new cljs.core.RedNode(left.right.key, left.right.val, cljs.core.balance_left.call(null, left.key, left.val, left.left.redden(), left.right.left), new cljs.core.BlackNode(key, val, left.right.right, del, null), null)
      }else {
        if("\ufdd0'else") {
          throw new Error("red-black tree invariant violation");
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.tree_map_kv_reduce = function tree_map_kv_reduce(node, f, init) {
  var init__9632 = f.call(null, init, node.key, node.val);
  if(cljs.core.reduced_QMARK_.call(null, init__9632)) {
    return cljs.core.deref.call(null, init__9632)
  }else {
    var init__9633 = !(node.left == null) ? tree_map_kv_reduce.call(null, node.left, f, init__9632) : init__9632;
    if(cljs.core.reduced_QMARK_.call(null, init__9633)) {
      return cljs.core.deref.call(null, init__9633)
    }else {
      var init__9634 = !(node.right == null) ? tree_map_kv_reduce.call(null, node.right, f, init__9633) : init__9633;
      if(cljs.core.reduced_QMARK_.call(null, init__9634)) {
        return cljs.core.deref.call(null, init__9634)
      }else {
        return init__9634
      }
    }
  }
};
cljs.core.BlackNode = function(key, val, left, right, __hash) {
  this.key = key;
  this.val = val;
  this.left = left;
  this.right = right;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32402207
};
cljs.core.BlackNode.cljs$lang$type = true;
cljs.core.BlackNode.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/BlackNode")
};
cljs.core.BlackNode.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9637 = this;
  var h__2188__auto____9638 = this__9637.__hash;
  if(!(h__2188__auto____9638 == null)) {
    return h__2188__auto____9638
  }else {
    var h__2188__auto____9639 = cljs.core.hash_coll.call(null, coll);
    this__9637.__hash = h__2188__auto____9639;
    return h__2188__auto____9639
  }
};
cljs.core.BlackNode.prototype.cljs$core$ILookup$_lookup$arity$2 = function(node, k) {
  var this__9640 = this;
  return node.cljs$core$IIndexed$_nth$arity$3(node, k, null)
};
cljs.core.BlackNode.prototype.cljs$core$ILookup$_lookup$arity$3 = function(node, k, not_found) {
  var this__9641 = this;
  return node.cljs$core$IIndexed$_nth$arity$3(node, k, not_found)
};
cljs.core.BlackNode.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(node, k, v) {
  var this__9642 = this;
  return cljs.core.assoc.call(null, cljs.core.PersistentVector.fromArray([this__9642.key, this__9642.val], true), k, v)
};
cljs.core.BlackNode.prototype.call = function() {
  var G__9690 = null;
  var G__9690__2 = function(this_sym9643, k) {
    var this__9645 = this;
    var this_sym9643__9646 = this;
    var node__9647 = this_sym9643__9646;
    return node__9647.cljs$core$ILookup$_lookup$arity$2(node__9647, k)
  };
  var G__9690__3 = function(this_sym9644, k, not_found) {
    var this__9645 = this;
    var this_sym9644__9648 = this;
    var node__9649 = this_sym9644__9648;
    return node__9649.cljs$core$ILookup$_lookup$arity$3(node__9649, k, not_found)
  };
  G__9690 = function(this_sym9644, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9690__2.call(this, this_sym9644, k);
      case 3:
        return G__9690__3.call(this, this_sym9644, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9690
}();
cljs.core.BlackNode.prototype.apply = function(this_sym9635, args9636) {
  var this__9650 = this;
  return this_sym9635.call.apply(this_sym9635, [this_sym9635].concat(args9636.slice()))
};
cljs.core.BlackNode.prototype.cljs$core$ICollection$_conj$arity$2 = function(node, o) {
  var this__9651 = this;
  return cljs.core.PersistentVector.fromArray([this__9651.key, this__9651.val, o], true)
};
cljs.core.BlackNode.prototype.cljs$core$IMapEntry$_key$arity$1 = function(node) {
  var this__9652 = this;
  return this__9652.key
};
cljs.core.BlackNode.prototype.cljs$core$IMapEntry$_val$arity$1 = function(node) {
  var this__9653 = this;
  return this__9653.val
};
cljs.core.BlackNode.prototype.add_right = function(ins) {
  var this__9654 = this;
  var node__9655 = this;
  return ins.balance_right(node__9655)
};
cljs.core.BlackNode.prototype.redden = function() {
  var this__9656 = this;
  var node__9657 = this;
  return new cljs.core.RedNode(this__9656.key, this__9656.val, this__9656.left, this__9656.right, null)
};
cljs.core.BlackNode.prototype.remove_right = function(del) {
  var this__9658 = this;
  var node__9659 = this;
  return cljs.core.balance_right_del.call(null, this__9658.key, this__9658.val, this__9658.left, del)
};
cljs.core.BlackNode.prototype.replace = function(key, val, left, right) {
  var this__9660 = this;
  var node__9661 = this;
  return new cljs.core.BlackNode(key, val, left, right, null)
};
cljs.core.BlackNode.prototype.kv_reduce = function(f, init) {
  var this__9662 = this;
  var node__9663 = this;
  return cljs.core.tree_map_kv_reduce.call(null, node__9663, f, init)
};
cljs.core.BlackNode.prototype.remove_left = function(del) {
  var this__9664 = this;
  var node__9665 = this;
  return cljs.core.balance_left_del.call(null, this__9664.key, this__9664.val, del, this__9664.right)
};
cljs.core.BlackNode.prototype.add_left = function(ins) {
  var this__9666 = this;
  var node__9667 = this;
  return ins.balance_left(node__9667)
};
cljs.core.BlackNode.prototype.balance_left = function(parent) {
  var this__9668 = this;
  var node__9669 = this;
  return new cljs.core.BlackNode(parent.key, parent.val, node__9669, parent.right, null)
};
cljs.core.BlackNode.prototype.toString = function() {
  var G__9691 = null;
  var G__9691__0 = function() {
    var this__9670 = this;
    var this__9672 = this;
    return cljs.core.pr_str.call(null, this__9672)
  };
  G__9691 = function() {
    switch(arguments.length) {
      case 0:
        return G__9691__0.call(this)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9691
}();
cljs.core.BlackNode.prototype.balance_right = function(parent) {
  var this__9673 = this;
  var node__9674 = this;
  return new cljs.core.BlackNode(parent.key, parent.val, parent.left, node__9674, null)
};
cljs.core.BlackNode.prototype.blacken = function() {
  var this__9675 = this;
  var node__9676 = this;
  return node__9676
};
cljs.core.BlackNode.prototype.cljs$core$IReduce$_reduce$arity$2 = function(node, f) {
  var this__9677 = this;
  return cljs.core.ci_reduce.call(null, node, f)
};
cljs.core.BlackNode.prototype.cljs$core$IReduce$_reduce$arity$3 = function(node, f, start) {
  var this__9678 = this;
  return cljs.core.ci_reduce.call(null, node, f, start)
};
cljs.core.BlackNode.prototype.cljs$core$ISeqable$_seq$arity$1 = function(node) {
  var this__9679 = this;
  return cljs.core.list.call(null, this__9679.key, this__9679.val)
};
cljs.core.BlackNode.prototype.cljs$core$ICounted$_count$arity$1 = function(node) {
  var this__9680 = this;
  return 2
};
cljs.core.BlackNode.prototype.cljs$core$IStack$_peek$arity$1 = function(node) {
  var this__9681 = this;
  return this__9681.val
};
cljs.core.BlackNode.prototype.cljs$core$IStack$_pop$arity$1 = function(node) {
  var this__9682 = this;
  return cljs.core.PersistentVector.fromArray([this__9682.key], true)
};
cljs.core.BlackNode.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(node, n, v) {
  var this__9683 = this;
  return cljs.core._assoc_n.call(null, cljs.core.PersistentVector.fromArray([this__9683.key, this__9683.val], true), n, v)
};
cljs.core.BlackNode.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9684 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.BlackNode.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(node, meta) {
  var this__9685 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.fromArray([this__9685.key, this__9685.val], true), meta)
};
cljs.core.BlackNode.prototype.cljs$core$IMeta$_meta$arity$1 = function(node) {
  var this__9686 = this;
  return null
};
cljs.core.BlackNode.prototype.cljs$core$IIndexed$_nth$arity$2 = function(node, n) {
  var this__9687 = this;
  if(n === 0) {
    return this__9687.key
  }else {
    if(n === 1) {
      return this__9687.val
    }else {
      if("\ufdd0'else") {
        return null
      }else {
        return null
      }
    }
  }
};
cljs.core.BlackNode.prototype.cljs$core$IIndexed$_nth$arity$3 = function(node, n, not_found) {
  var this__9688 = this;
  if(n === 0) {
    return this__9688.key
  }else {
    if(n === 1) {
      return this__9688.val
    }else {
      if("\ufdd0'else") {
        return not_found
      }else {
        return null
      }
    }
  }
};
cljs.core.BlackNode.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(node) {
  var this__9689 = this;
  return cljs.core.PersistentVector.EMPTY
};
cljs.core.BlackNode;
cljs.core.RedNode = function(key, val, left, right, __hash) {
  this.key = key;
  this.val = val;
  this.left = left;
  this.right = right;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32402207
};
cljs.core.RedNode.cljs$lang$type = true;
cljs.core.RedNode.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/RedNode")
};
cljs.core.RedNode.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9694 = this;
  var h__2188__auto____9695 = this__9694.__hash;
  if(!(h__2188__auto____9695 == null)) {
    return h__2188__auto____9695
  }else {
    var h__2188__auto____9696 = cljs.core.hash_coll.call(null, coll);
    this__9694.__hash = h__2188__auto____9696;
    return h__2188__auto____9696
  }
};
cljs.core.RedNode.prototype.cljs$core$ILookup$_lookup$arity$2 = function(node, k) {
  var this__9697 = this;
  return node.cljs$core$IIndexed$_nth$arity$3(node, k, null)
};
cljs.core.RedNode.prototype.cljs$core$ILookup$_lookup$arity$3 = function(node, k, not_found) {
  var this__9698 = this;
  return node.cljs$core$IIndexed$_nth$arity$3(node, k, not_found)
};
cljs.core.RedNode.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(node, k, v) {
  var this__9699 = this;
  return cljs.core.assoc.call(null, cljs.core.PersistentVector.fromArray([this__9699.key, this__9699.val], true), k, v)
};
cljs.core.RedNode.prototype.call = function() {
  var G__9747 = null;
  var G__9747__2 = function(this_sym9700, k) {
    var this__9702 = this;
    var this_sym9700__9703 = this;
    var node__9704 = this_sym9700__9703;
    return node__9704.cljs$core$ILookup$_lookup$arity$2(node__9704, k)
  };
  var G__9747__3 = function(this_sym9701, k, not_found) {
    var this__9702 = this;
    var this_sym9701__9705 = this;
    var node__9706 = this_sym9701__9705;
    return node__9706.cljs$core$ILookup$_lookup$arity$3(node__9706, k, not_found)
  };
  G__9747 = function(this_sym9701, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9747__2.call(this, this_sym9701, k);
      case 3:
        return G__9747__3.call(this, this_sym9701, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9747
}();
cljs.core.RedNode.prototype.apply = function(this_sym9692, args9693) {
  var this__9707 = this;
  return this_sym9692.call.apply(this_sym9692, [this_sym9692].concat(args9693.slice()))
};
cljs.core.RedNode.prototype.cljs$core$ICollection$_conj$arity$2 = function(node, o) {
  var this__9708 = this;
  return cljs.core.PersistentVector.fromArray([this__9708.key, this__9708.val, o], true)
};
cljs.core.RedNode.prototype.cljs$core$IMapEntry$_key$arity$1 = function(node) {
  var this__9709 = this;
  return this__9709.key
};
cljs.core.RedNode.prototype.cljs$core$IMapEntry$_val$arity$1 = function(node) {
  var this__9710 = this;
  return this__9710.val
};
cljs.core.RedNode.prototype.add_right = function(ins) {
  var this__9711 = this;
  var node__9712 = this;
  return new cljs.core.RedNode(this__9711.key, this__9711.val, this__9711.left, ins, null)
};
cljs.core.RedNode.prototype.redden = function() {
  var this__9713 = this;
  var node__9714 = this;
  throw new Error("red-black tree invariant violation");
};
cljs.core.RedNode.prototype.remove_right = function(del) {
  var this__9715 = this;
  var node__9716 = this;
  return new cljs.core.RedNode(this__9715.key, this__9715.val, this__9715.left, del, null)
};
cljs.core.RedNode.prototype.replace = function(key, val, left, right) {
  var this__9717 = this;
  var node__9718 = this;
  return new cljs.core.RedNode(key, val, left, right, null)
};
cljs.core.RedNode.prototype.kv_reduce = function(f, init) {
  var this__9719 = this;
  var node__9720 = this;
  return cljs.core.tree_map_kv_reduce.call(null, node__9720, f, init)
};
cljs.core.RedNode.prototype.remove_left = function(del) {
  var this__9721 = this;
  var node__9722 = this;
  return new cljs.core.RedNode(this__9721.key, this__9721.val, del, this__9721.right, null)
};
cljs.core.RedNode.prototype.add_left = function(ins) {
  var this__9723 = this;
  var node__9724 = this;
  return new cljs.core.RedNode(this__9723.key, this__9723.val, ins, this__9723.right, null)
};
cljs.core.RedNode.prototype.balance_left = function(parent) {
  var this__9725 = this;
  var node__9726 = this;
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, this__9725.left)) {
    return new cljs.core.RedNode(this__9725.key, this__9725.val, this__9725.left.blacken(), new cljs.core.BlackNode(parent.key, parent.val, this__9725.right, parent.right, null), null)
  }else {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, this__9725.right)) {
      return new cljs.core.RedNode(this__9725.right.key, this__9725.right.val, new cljs.core.BlackNode(this__9725.key, this__9725.val, this__9725.left, this__9725.right.left, null), new cljs.core.BlackNode(parent.key, parent.val, this__9725.right.right, parent.right, null), null)
    }else {
      if("\ufdd0'else") {
        return new cljs.core.BlackNode(parent.key, parent.val, node__9726, parent.right, null)
      }else {
        return null
      }
    }
  }
};
cljs.core.RedNode.prototype.toString = function() {
  var G__9748 = null;
  var G__9748__0 = function() {
    var this__9727 = this;
    var this__9729 = this;
    return cljs.core.pr_str.call(null, this__9729)
  };
  G__9748 = function() {
    switch(arguments.length) {
      case 0:
        return G__9748__0.call(this)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9748
}();
cljs.core.RedNode.prototype.balance_right = function(parent) {
  var this__9730 = this;
  var node__9731 = this;
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, this__9730.right)) {
    return new cljs.core.RedNode(this__9730.key, this__9730.val, new cljs.core.BlackNode(parent.key, parent.val, parent.left, this__9730.left, null), this__9730.right.blacken(), null)
  }else {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, this__9730.left)) {
      return new cljs.core.RedNode(this__9730.left.key, this__9730.left.val, new cljs.core.BlackNode(parent.key, parent.val, parent.left, this__9730.left.left, null), new cljs.core.BlackNode(this__9730.key, this__9730.val, this__9730.left.right, this__9730.right, null), null)
    }else {
      if("\ufdd0'else") {
        return new cljs.core.BlackNode(parent.key, parent.val, parent.left, node__9731, null)
      }else {
        return null
      }
    }
  }
};
cljs.core.RedNode.prototype.blacken = function() {
  var this__9732 = this;
  var node__9733 = this;
  return new cljs.core.BlackNode(this__9732.key, this__9732.val, this__9732.left, this__9732.right, null)
};
cljs.core.RedNode.prototype.cljs$core$IReduce$_reduce$arity$2 = function(node, f) {
  var this__9734 = this;
  return cljs.core.ci_reduce.call(null, node, f)
};
cljs.core.RedNode.prototype.cljs$core$IReduce$_reduce$arity$3 = function(node, f, start) {
  var this__9735 = this;
  return cljs.core.ci_reduce.call(null, node, f, start)
};
cljs.core.RedNode.prototype.cljs$core$ISeqable$_seq$arity$1 = function(node) {
  var this__9736 = this;
  return cljs.core.list.call(null, this__9736.key, this__9736.val)
};
cljs.core.RedNode.prototype.cljs$core$ICounted$_count$arity$1 = function(node) {
  var this__9737 = this;
  return 2
};
cljs.core.RedNode.prototype.cljs$core$IStack$_peek$arity$1 = function(node) {
  var this__9738 = this;
  return this__9738.val
};
cljs.core.RedNode.prototype.cljs$core$IStack$_pop$arity$1 = function(node) {
  var this__9739 = this;
  return cljs.core.PersistentVector.fromArray([this__9739.key], true)
};
cljs.core.RedNode.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(node, n, v) {
  var this__9740 = this;
  return cljs.core._assoc_n.call(null, cljs.core.PersistentVector.fromArray([this__9740.key, this__9740.val], true), n, v)
};
cljs.core.RedNode.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9741 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.RedNode.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(node, meta) {
  var this__9742 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.fromArray([this__9742.key, this__9742.val], true), meta)
};
cljs.core.RedNode.prototype.cljs$core$IMeta$_meta$arity$1 = function(node) {
  var this__9743 = this;
  return null
};
cljs.core.RedNode.prototype.cljs$core$IIndexed$_nth$arity$2 = function(node, n) {
  var this__9744 = this;
  if(n === 0) {
    return this__9744.key
  }else {
    if(n === 1) {
      return this__9744.val
    }else {
      if("\ufdd0'else") {
        return null
      }else {
        return null
      }
    }
  }
};
cljs.core.RedNode.prototype.cljs$core$IIndexed$_nth$arity$3 = function(node, n, not_found) {
  var this__9745 = this;
  if(n === 0) {
    return this__9745.key
  }else {
    if(n === 1) {
      return this__9745.val
    }else {
      if("\ufdd0'else") {
        return not_found
      }else {
        return null
      }
    }
  }
};
cljs.core.RedNode.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(node) {
  var this__9746 = this;
  return cljs.core.PersistentVector.EMPTY
};
cljs.core.RedNode;
cljs.core.tree_map_add = function tree_map_add(comp, tree, k, v, found) {
  if(tree == null) {
    return new cljs.core.RedNode(k, v, null, null, null)
  }else {
    var c__9752 = comp.call(null, k, tree.key);
    if(c__9752 === 0) {
      found[0] = tree;
      return null
    }else {
      if(c__9752 < 0) {
        var ins__9753 = tree_map_add.call(null, comp, tree.left, k, v, found);
        if(!(ins__9753 == null)) {
          return tree.add_left(ins__9753)
        }else {
          return null
        }
      }else {
        if("\ufdd0'else") {
          var ins__9754 = tree_map_add.call(null, comp, tree.right, k, v, found);
          if(!(ins__9754 == null)) {
            return tree.add_right(ins__9754)
          }else {
            return null
          }
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.tree_map_append = function tree_map_append(left, right) {
  if(left == null) {
    return right
  }else {
    if(right == null) {
      return left
    }else {
      if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, left)) {
        if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, right)) {
          var app__9757 = tree_map_append.call(null, left.right, right.left);
          if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, app__9757)) {
            return new cljs.core.RedNode(app__9757.key, app__9757.val, new cljs.core.RedNode(left.key, left.val, left.left, app__9757.left, null), new cljs.core.RedNode(right.key, right.val, app__9757.right, right.right, null), null)
          }else {
            return new cljs.core.RedNode(left.key, left.val, left.left, new cljs.core.RedNode(right.key, right.val, app__9757, right.right, null), null)
          }
        }else {
          return new cljs.core.RedNode(left.key, left.val, left.left, tree_map_append.call(null, left.right, right), null)
        }
      }else {
        if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, right)) {
          return new cljs.core.RedNode(right.key, right.val, tree_map_append.call(null, left, right.left), right.right, null)
        }else {
          if("\ufdd0'else") {
            var app__9758 = tree_map_append.call(null, left.right, right.left);
            if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, app__9758)) {
              return new cljs.core.RedNode(app__9758.key, app__9758.val, new cljs.core.BlackNode(left.key, left.val, left.left, app__9758.left, null), new cljs.core.BlackNode(right.key, right.val, app__9758.right, right.right, null), null)
            }else {
              return cljs.core.balance_left_del.call(null, left.key, left.val, left.left, new cljs.core.BlackNode(right.key, right.val, app__9758, right.right, null))
            }
          }else {
            return null
          }
        }
      }
    }
  }
};
cljs.core.tree_map_remove = function tree_map_remove(comp, tree, k, found) {
  if(!(tree == null)) {
    var c__9764 = comp.call(null, k, tree.key);
    if(c__9764 === 0) {
      found[0] = tree;
      return cljs.core.tree_map_append.call(null, tree.left, tree.right)
    }else {
      if(c__9764 < 0) {
        var del__9765 = tree_map_remove.call(null, comp, tree.left, k, found);
        if(function() {
          var or__3824__auto____9766 = !(del__9765 == null);
          if(or__3824__auto____9766) {
            return or__3824__auto____9766
          }else {
            return!(found[0] == null)
          }
        }()) {
          if(cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, tree.left)) {
            return cljs.core.balance_left_del.call(null, tree.key, tree.val, del__9765, tree.right)
          }else {
            return new cljs.core.RedNode(tree.key, tree.val, del__9765, tree.right, null)
          }
        }else {
          return null
        }
      }else {
        if("\ufdd0'else") {
          var del__9767 = tree_map_remove.call(null, comp, tree.right, k, found);
          if(function() {
            var or__3824__auto____9768 = !(del__9767 == null);
            if(or__3824__auto____9768) {
              return or__3824__auto____9768
            }else {
              return!(found[0] == null)
            }
          }()) {
            if(cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, tree.right)) {
              return cljs.core.balance_right_del.call(null, tree.key, tree.val, tree.left, del__9767)
            }else {
              return new cljs.core.RedNode(tree.key, tree.val, tree.left, del__9767, null)
            }
          }else {
            return null
          }
        }else {
          return null
        }
      }
    }
  }else {
    return null
  }
};
cljs.core.tree_map_replace = function tree_map_replace(comp, tree, k, v) {
  var tk__9771 = tree.key;
  var c__9772 = comp.call(null, k, tk__9771);
  if(c__9772 === 0) {
    return tree.replace(tk__9771, v, tree.left, tree.right)
  }else {
    if(c__9772 < 0) {
      return tree.replace(tk__9771, tree.val, tree_map_replace.call(null, comp, tree.left, k, v), tree.right)
    }else {
      if("\ufdd0'else") {
        return tree.replace(tk__9771, tree.val, tree.left, tree_map_replace.call(null, comp, tree.right, k, v))
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentTreeMap = function(comp, tree, cnt, meta, __hash) {
  this.comp = comp;
  this.tree = tree;
  this.cnt = cnt;
  this.meta = meta;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 418776847
};
cljs.core.PersistentTreeMap.cljs$lang$type = true;
cljs.core.PersistentTreeMap.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentTreeMap")
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9775 = this;
  var h__2188__auto____9776 = this__9775.__hash;
  if(!(h__2188__auto____9776 == null)) {
    return h__2188__auto____9776
  }else {
    var h__2188__auto____9777 = cljs.core.hash_imap.call(null, coll);
    this__9775.__hash = h__2188__auto____9777;
    return h__2188__auto____9777
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__9778 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, k, null)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__9779 = this;
  var n__9780 = coll.entry_at(k);
  if(!(n__9780 == null)) {
    return n__9780.val
  }else {
    return not_found
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__9781 = this;
  var found__9782 = [null];
  var t__9783 = cljs.core.tree_map_add.call(null, this__9781.comp, this__9781.tree, k, v, found__9782);
  if(t__9783 == null) {
    var found_node__9784 = cljs.core.nth.call(null, found__9782, 0);
    if(cljs.core._EQ_.call(null, v, found_node__9784.val)) {
      return coll
    }else {
      return new cljs.core.PersistentTreeMap(this__9781.comp, cljs.core.tree_map_replace.call(null, this__9781.comp, this__9781.tree, k, v), this__9781.cnt, this__9781.meta, null)
    }
  }else {
    return new cljs.core.PersistentTreeMap(this__9781.comp, t__9783.blacken(), this__9781.cnt + 1, this__9781.meta, null)
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__9785 = this;
  return!(coll.entry_at(k) == null)
};
cljs.core.PersistentTreeMap.prototype.call = function() {
  var G__9819 = null;
  var G__9819__2 = function(this_sym9786, k) {
    var this__9788 = this;
    var this_sym9786__9789 = this;
    var coll__9790 = this_sym9786__9789;
    return coll__9790.cljs$core$ILookup$_lookup$arity$2(coll__9790, k)
  };
  var G__9819__3 = function(this_sym9787, k, not_found) {
    var this__9788 = this;
    var this_sym9787__9791 = this;
    var coll__9792 = this_sym9787__9791;
    return coll__9792.cljs$core$ILookup$_lookup$arity$3(coll__9792, k, not_found)
  };
  G__9819 = function(this_sym9787, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9819__2.call(this, this_sym9787, k);
      case 3:
        return G__9819__3.call(this, this_sym9787, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9819
}();
cljs.core.PersistentTreeMap.prototype.apply = function(this_sym9773, args9774) {
  var this__9793 = this;
  return this_sym9773.call.apply(this_sym9773, [this_sym9773].concat(args9774.slice()))
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = function(coll, f, init) {
  var this__9794 = this;
  if(!(this__9794.tree == null)) {
    return cljs.core.tree_map_kv_reduce.call(null, this__9794.tree, f, init)
  }else {
    return init
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__9795 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var this__9796 = this;
  if(this__9796.cnt > 0) {
    return cljs.core.create_tree_map_seq.call(null, this__9796.tree, false, this__9796.cnt)
  }else {
    return null
  }
};
cljs.core.PersistentTreeMap.prototype.toString = function() {
  var this__9797 = this;
  var this__9798 = this;
  return cljs.core.pr_str.call(null, this__9798)
};
cljs.core.PersistentTreeMap.prototype.entry_at = function(k) {
  var this__9799 = this;
  var coll__9800 = this;
  var t__9801 = this__9799.tree;
  while(true) {
    if(!(t__9801 == null)) {
      var c__9802 = this__9799.comp.call(null, k, t__9801.key);
      if(c__9802 === 0) {
        return t__9801
      }else {
        if(c__9802 < 0) {
          var G__9820 = t__9801.left;
          t__9801 = G__9820;
          continue
        }else {
          if("\ufdd0'else") {
            var G__9821 = t__9801.right;
            t__9801 = G__9821;
            continue
          }else {
            return null
          }
        }
      }
    }else {
      return null
    }
    break
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_sorted_seq$arity$2 = function(coll, ascending_QMARK_) {
  var this__9803 = this;
  if(this__9803.cnt > 0) {
    return cljs.core.create_tree_map_seq.call(null, this__9803.tree, ascending_QMARK_, this__9803.cnt)
  }else {
    return null
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_sorted_seq_from$arity$3 = function(coll, k, ascending_QMARK_) {
  var this__9804 = this;
  if(this__9804.cnt > 0) {
    var stack__9805 = null;
    var t__9806 = this__9804.tree;
    while(true) {
      if(!(t__9806 == null)) {
        var c__9807 = this__9804.comp.call(null, k, t__9806.key);
        if(c__9807 === 0) {
          return new cljs.core.PersistentTreeMapSeq(null, cljs.core.conj.call(null, stack__9805, t__9806), ascending_QMARK_, -1, null)
        }else {
          if(cljs.core.truth_(ascending_QMARK_)) {
            if(c__9807 < 0) {
              var G__9822 = cljs.core.conj.call(null, stack__9805, t__9806);
              var G__9823 = t__9806.left;
              stack__9805 = G__9822;
              t__9806 = G__9823;
              continue
            }else {
              var G__9824 = stack__9805;
              var G__9825 = t__9806.right;
              stack__9805 = G__9824;
              t__9806 = G__9825;
              continue
            }
          }else {
            if("\ufdd0'else") {
              if(c__9807 > 0) {
                var G__9826 = cljs.core.conj.call(null, stack__9805, t__9806);
                var G__9827 = t__9806.right;
                stack__9805 = G__9826;
                t__9806 = G__9827;
                continue
              }else {
                var G__9828 = stack__9805;
                var G__9829 = t__9806.left;
                stack__9805 = G__9828;
                t__9806 = G__9829;
                continue
              }
            }else {
              return null
            }
          }
        }
      }else {
        if(stack__9805 == null) {
          return new cljs.core.PersistentTreeMapSeq(null, stack__9805, ascending_QMARK_, -1, null)
        }else {
          return null
        }
      }
      break
    }
  }else {
    return null
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_entry_key$arity$2 = function(coll, entry) {
  var this__9808 = this;
  return cljs.core.key.call(null, entry)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_comparator$arity$1 = function(coll) {
  var this__9809 = this;
  return this__9809.comp
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__9810 = this;
  if(this__9810.cnt > 0) {
    return cljs.core.create_tree_map_seq.call(null, this__9810.tree, true, this__9810.cnt)
  }else {
    return null
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9811 = this;
  return this__9811.cnt
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9812 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9813 = this;
  return new cljs.core.PersistentTreeMap(this__9813.comp, this__9813.tree, this__9813.cnt, meta, this__9813.__hash)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9814 = this;
  return this__9814.meta
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9815 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentTreeMap.EMPTY, this__9815.meta)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__9816 = this;
  var found__9817 = [null];
  var t__9818 = cljs.core.tree_map_remove.call(null, this__9816.comp, this__9816.tree, k, found__9817);
  if(t__9818 == null) {
    if(cljs.core.nth.call(null, found__9817, 0) == null) {
      return coll
    }else {
      return new cljs.core.PersistentTreeMap(this__9816.comp, null, 0, this__9816.meta, null)
    }
  }else {
    return new cljs.core.PersistentTreeMap(this__9816.comp, t__9818.blacken(), this__9816.cnt - 1, this__9816.meta, null)
  }
};
cljs.core.PersistentTreeMap;
cljs.core.PersistentTreeMap.EMPTY = new cljs.core.PersistentTreeMap(cljs.core.compare, null, 0, null, 0);
cljs.core.hash_map = function() {
  var hash_map__delegate = function(keyvals) {
    var in__9832 = cljs.core.seq.call(null, keyvals);
    var out__9833 = cljs.core.transient$.call(null, cljs.core.PersistentHashMap.EMPTY);
    while(true) {
      if(in__9832) {
        var G__9834 = cljs.core.nnext.call(null, in__9832);
        var G__9835 = cljs.core.assoc_BANG_.call(null, out__9833, cljs.core.first.call(null, in__9832), cljs.core.second.call(null, in__9832));
        in__9832 = G__9834;
        out__9833 = G__9835;
        continue
      }else {
        return cljs.core.persistent_BANG_.call(null, out__9833)
      }
      break
    }
  };
  var hash_map = function(var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return hash_map__delegate.call(this, keyvals)
  };
  hash_map.cljs$lang$maxFixedArity = 0;
  hash_map.cljs$lang$applyTo = function(arglist__9836) {
    var keyvals = cljs.core.seq(arglist__9836);
    return hash_map__delegate(keyvals)
  };
  hash_map.cljs$lang$arity$variadic = hash_map__delegate;
  return hash_map
}();
cljs.core.array_map = function() {
  var array_map__delegate = function(keyvals) {
    return new cljs.core.PersistentArrayMap(null, cljs.core.quot.call(null, cljs.core.count.call(null, keyvals), 2), cljs.core.apply.call(null, cljs.core.array, keyvals), null)
  };
  var array_map = function(var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return array_map__delegate.call(this, keyvals)
  };
  array_map.cljs$lang$maxFixedArity = 0;
  array_map.cljs$lang$applyTo = function(arglist__9837) {
    var keyvals = cljs.core.seq(arglist__9837);
    return array_map__delegate(keyvals)
  };
  array_map.cljs$lang$arity$variadic = array_map__delegate;
  return array_map
}();
cljs.core.obj_map = function() {
  var obj_map__delegate = function(keyvals) {
    var ks__9841 = [];
    var obj__9842 = {};
    var kvs__9843 = cljs.core.seq.call(null, keyvals);
    while(true) {
      if(kvs__9843) {
        ks__9841.push(cljs.core.first.call(null, kvs__9843));
        obj__9842[cljs.core.first.call(null, kvs__9843)] = cljs.core.second.call(null, kvs__9843);
        var G__9844 = cljs.core.nnext.call(null, kvs__9843);
        kvs__9843 = G__9844;
        continue
      }else {
        return cljs.core.ObjMap.fromObject.call(null, ks__9841, obj__9842)
      }
      break
    }
  };
  var obj_map = function(var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return obj_map__delegate.call(this, keyvals)
  };
  obj_map.cljs$lang$maxFixedArity = 0;
  obj_map.cljs$lang$applyTo = function(arglist__9845) {
    var keyvals = cljs.core.seq(arglist__9845);
    return obj_map__delegate(keyvals)
  };
  obj_map.cljs$lang$arity$variadic = obj_map__delegate;
  return obj_map
}();
cljs.core.sorted_map = function() {
  var sorted_map__delegate = function(keyvals) {
    var in__9848 = cljs.core.seq.call(null, keyvals);
    var out__9849 = cljs.core.PersistentTreeMap.EMPTY;
    while(true) {
      if(in__9848) {
        var G__9850 = cljs.core.nnext.call(null, in__9848);
        var G__9851 = cljs.core.assoc.call(null, out__9849, cljs.core.first.call(null, in__9848), cljs.core.second.call(null, in__9848));
        in__9848 = G__9850;
        out__9849 = G__9851;
        continue
      }else {
        return out__9849
      }
      break
    }
  };
  var sorted_map = function(var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return sorted_map__delegate.call(this, keyvals)
  };
  sorted_map.cljs$lang$maxFixedArity = 0;
  sorted_map.cljs$lang$applyTo = function(arglist__9852) {
    var keyvals = cljs.core.seq(arglist__9852);
    return sorted_map__delegate(keyvals)
  };
  sorted_map.cljs$lang$arity$variadic = sorted_map__delegate;
  return sorted_map
}();
cljs.core.sorted_map_by = function() {
  var sorted_map_by__delegate = function(comparator, keyvals) {
    var in__9855 = cljs.core.seq.call(null, keyvals);
    var out__9856 = new cljs.core.PersistentTreeMap(comparator, null, 0, null, 0);
    while(true) {
      if(in__9855) {
        var G__9857 = cljs.core.nnext.call(null, in__9855);
        var G__9858 = cljs.core.assoc.call(null, out__9856, cljs.core.first.call(null, in__9855), cljs.core.second.call(null, in__9855));
        in__9855 = G__9857;
        out__9856 = G__9858;
        continue
      }else {
        return out__9856
      }
      break
    }
  };
  var sorted_map_by = function(comparator, var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return sorted_map_by__delegate.call(this, comparator, keyvals)
  };
  sorted_map_by.cljs$lang$maxFixedArity = 1;
  sorted_map_by.cljs$lang$applyTo = function(arglist__9859) {
    var comparator = cljs.core.first(arglist__9859);
    var keyvals = cljs.core.rest(arglist__9859);
    return sorted_map_by__delegate(comparator, keyvals)
  };
  sorted_map_by.cljs$lang$arity$variadic = sorted_map_by__delegate;
  return sorted_map_by
}();
cljs.core.keys = function keys(hash_map) {
  return cljs.core.seq.call(null, cljs.core.map.call(null, cljs.core.first, hash_map))
};
cljs.core.key = function key(map_entry) {
  return cljs.core._key.call(null, map_entry)
};
cljs.core.vals = function vals(hash_map) {
  return cljs.core.seq.call(null, cljs.core.map.call(null, cljs.core.second, hash_map))
};
cljs.core.val = function val(map_entry) {
  return cljs.core._val.call(null, map_entry)
};
cljs.core.merge = function() {
  var merge__delegate = function(maps) {
    if(cljs.core.truth_(cljs.core.some.call(null, cljs.core.identity, maps))) {
      return cljs.core.reduce.call(null, function(p1__9860_SHARP_, p2__9861_SHARP_) {
        return cljs.core.conj.call(null, function() {
          var or__3824__auto____9863 = p1__9860_SHARP_;
          if(cljs.core.truth_(or__3824__auto____9863)) {
            return or__3824__auto____9863
          }else {
            return cljs.core.ObjMap.EMPTY
          }
        }(), p2__9861_SHARP_)
      }, maps)
    }else {
      return null
    }
  };
  var merge = function(var_args) {
    var maps = null;
    if(goog.isDef(var_args)) {
      maps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return merge__delegate.call(this, maps)
  };
  merge.cljs$lang$maxFixedArity = 0;
  merge.cljs$lang$applyTo = function(arglist__9864) {
    var maps = cljs.core.seq(arglist__9864);
    return merge__delegate(maps)
  };
  merge.cljs$lang$arity$variadic = merge__delegate;
  return merge
}();
cljs.core.merge_with = function() {
  var merge_with__delegate = function(f, maps) {
    if(cljs.core.truth_(cljs.core.some.call(null, cljs.core.identity, maps))) {
      var merge_entry__9872 = function(m, e) {
        var k__9870 = cljs.core.first.call(null, e);
        var v__9871 = cljs.core.second.call(null, e);
        if(cljs.core.contains_QMARK_.call(null, m, k__9870)) {
          return cljs.core.assoc.call(null, m, k__9870, f.call(null, cljs.core._lookup.call(null, m, k__9870, null), v__9871))
        }else {
          return cljs.core.assoc.call(null, m, k__9870, v__9871)
        }
      };
      var merge2__9874 = function(m1, m2) {
        return cljs.core.reduce.call(null, merge_entry__9872, function() {
          var or__3824__auto____9873 = m1;
          if(cljs.core.truth_(or__3824__auto____9873)) {
            return or__3824__auto____9873
          }else {
            return cljs.core.ObjMap.EMPTY
          }
        }(), cljs.core.seq.call(null, m2))
      };
      return cljs.core.reduce.call(null, merge2__9874, maps)
    }else {
      return null
    }
  };
  var merge_with = function(f, var_args) {
    var maps = null;
    if(goog.isDef(var_args)) {
      maps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return merge_with__delegate.call(this, f, maps)
  };
  merge_with.cljs$lang$maxFixedArity = 1;
  merge_with.cljs$lang$applyTo = function(arglist__9875) {
    var f = cljs.core.first(arglist__9875);
    var maps = cljs.core.rest(arglist__9875);
    return merge_with__delegate(f, maps)
  };
  merge_with.cljs$lang$arity$variadic = merge_with__delegate;
  return merge_with
}();
cljs.core.select_keys = function select_keys(map, keyseq) {
  var ret__9880 = cljs.core.ObjMap.EMPTY;
  var keys__9881 = cljs.core.seq.call(null, keyseq);
  while(true) {
    if(keys__9881) {
      var key__9882 = cljs.core.first.call(null, keys__9881);
      var entry__9883 = cljs.core._lookup.call(null, map, key__9882, "\ufdd0'user/not-found");
      var G__9884 = cljs.core.not_EQ_.call(null, entry__9883, "\ufdd0'user/not-found") ? cljs.core.assoc.call(null, ret__9880, key__9882, entry__9883) : ret__9880;
      var G__9885 = cljs.core.next.call(null, keys__9881);
      ret__9880 = G__9884;
      keys__9881 = G__9885;
      continue
    }else {
      return ret__9880
    }
    break
  }
};
cljs.core.PersistentHashSet = function(meta, hash_map, __hash) {
  this.meta = meta;
  this.hash_map = hash_map;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 1;
  this.cljs$lang$protocol_mask$partition0$ = 15077647
};
cljs.core.PersistentHashSet.cljs$lang$type = true;
cljs.core.PersistentHashSet.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentHashSet")
};
cljs.core.PersistentHashSet.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var this__9889 = this;
  return new cljs.core.TransientHashSet(cljs.core.transient$.call(null, this__9889.hash_map))
};
cljs.core.PersistentHashSet.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9890 = this;
  var h__2188__auto____9891 = this__9890.__hash;
  if(!(h__2188__auto____9891 == null)) {
    return h__2188__auto____9891
  }else {
    var h__2188__auto____9892 = cljs.core.hash_iset.call(null, coll);
    this__9890.__hash = h__2188__auto____9892;
    return h__2188__auto____9892
  }
};
cljs.core.PersistentHashSet.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, v) {
  var this__9893 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, v, null)
};
cljs.core.PersistentHashSet.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, v, not_found) {
  var this__9894 = this;
  if(cljs.core.truth_(cljs.core._contains_key_QMARK_.call(null, this__9894.hash_map, v))) {
    return v
  }else {
    return not_found
  }
};
cljs.core.PersistentHashSet.prototype.call = function() {
  var G__9915 = null;
  var G__9915__2 = function(this_sym9895, k) {
    var this__9897 = this;
    var this_sym9895__9898 = this;
    var coll__9899 = this_sym9895__9898;
    return coll__9899.cljs$core$ILookup$_lookup$arity$2(coll__9899, k)
  };
  var G__9915__3 = function(this_sym9896, k, not_found) {
    var this__9897 = this;
    var this_sym9896__9900 = this;
    var coll__9901 = this_sym9896__9900;
    return coll__9901.cljs$core$ILookup$_lookup$arity$3(coll__9901, k, not_found)
  };
  G__9915 = function(this_sym9896, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9915__2.call(this, this_sym9896, k);
      case 3:
        return G__9915__3.call(this, this_sym9896, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9915
}();
cljs.core.PersistentHashSet.prototype.apply = function(this_sym9887, args9888) {
  var this__9902 = this;
  return this_sym9887.call.apply(this_sym9887, [this_sym9887].concat(args9888.slice()))
};
cljs.core.PersistentHashSet.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__9903 = this;
  return new cljs.core.PersistentHashSet(this__9903.meta, cljs.core.assoc.call(null, this__9903.hash_map, o, null), null)
};
cljs.core.PersistentHashSet.prototype.toString = function() {
  var this__9904 = this;
  var this__9905 = this;
  return cljs.core.pr_str.call(null, this__9905)
};
cljs.core.PersistentHashSet.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__9906 = this;
  return cljs.core.keys.call(null, this__9906.hash_map)
};
cljs.core.PersistentHashSet.prototype.cljs$core$ISet$_disjoin$arity$2 = function(coll, v) {
  var this__9907 = this;
  return new cljs.core.PersistentHashSet(this__9907.meta, cljs.core.dissoc.call(null, this__9907.hash_map, v), null)
};
cljs.core.PersistentHashSet.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9908 = this;
  return cljs.core.count.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.PersistentHashSet.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9909 = this;
  var and__3822__auto____9910 = cljs.core.set_QMARK_.call(null, other);
  if(and__3822__auto____9910) {
    var and__3822__auto____9911 = cljs.core.count.call(null, coll) === cljs.core.count.call(null, other);
    if(and__3822__auto____9911) {
      return cljs.core.every_QMARK_.call(null, function(p1__9886_SHARP_) {
        return cljs.core.contains_QMARK_.call(null, coll, p1__9886_SHARP_)
      }, other)
    }else {
      return and__3822__auto____9911
    }
  }else {
    return and__3822__auto____9910
  }
};
cljs.core.PersistentHashSet.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9912 = this;
  return new cljs.core.PersistentHashSet(meta, this__9912.hash_map, this__9912.__hash)
};
cljs.core.PersistentHashSet.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9913 = this;
  return this__9913.meta
};
cljs.core.PersistentHashSet.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9914 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentHashSet.EMPTY, this__9914.meta)
};
cljs.core.PersistentHashSet;
cljs.core.PersistentHashSet.EMPTY = new cljs.core.PersistentHashSet(null, cljs.core.hash_map.call(null), 0);
cljs.core.PersistentHashSet.fromArray = function(items) {
  var len__9916 = cljs.core.count.call(null, items);
  var i__9917 = 0;
  var out__9918 = cljs.core.transient$.call(null, cljs.core.PersistentHashSet.EMPTY);
  while(true) {
    if(i__9917 < len__9916) {
      var G__9919 = i__9917 + 1;
      var G__9920 = cljs.core.conj_BANG_.call(null, out__9918, items[i__9917]);
      i__9917 = G__9919;
      out__9918 = G__9920;
      continue
    }else {
      return cljs.core.persistent_BANG_.call(null, out__9918)
    }
    break
  }
};
cljs.core.TransientHashSet = function(transient_map) {
  this.transient_map = transient_map;
  this.cljs$lang$protocol_mask$partition0$ = 259;
  this.cljs$lang$protocol_mask$partition1$ = 34
};
cljs.core.TransientHashSet.cljs$lang$type = true;
cljs.core.TransientHashSet.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/TransientHashSet")
};
cljs.core.TransientHashSet.prototype.call = function() {
  var G__9938 = null;
  var G__9938__2 = function(this_sym9924, k) {
    var this__9926 = this;
    var this_sym9924__9927 = this;
    var tcoll__9928 = this_sym9924__9927;
    if(cljs.core._lookup.call(null, this__9926.transient_map, k, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
      return null
    }else {
      return k
    }
  };
  var G__9938__3 = function(this_sym9925, k, not_found) {
    var this__9926 = this;
    var this_sym9925__9929 = this;
    var tcoll__9930 = this_sym9925__9929;
    if(cljs.core._lookup.call(null, this__9926.transient_map, k, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
      return not_found
    }else {
      return k
    }
  };
  G__9938 = function(this_sym9925, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9938__2.call(this, this_sym9925, k);
      case 3:
        return G__9938__3.call(this, this_sym9925, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9938
}();
cljs.core.TransientHashSet.prototype.apply = function(this_sym9922, args9923) {
  var this__9931 = this;
  return this_sym9922.call.apply(this_sym9922, [this_sym9922].concat(args9923.slice()))
};
cljs.core.TransientHashSet.prototype.cljs$core$ILookup$_lookup$arity$2 = function(tcoll, v) {
  var this__9932 = this;
  return tcoll.cljs$core$ILookup$_lookup$arity$3(tcoll, v, null)
};
cljs.core.TransientHashSet.prototype.cljs$core$ILookup$_lookup$arity$3 = function(tcoll, v, not_found) {
  var this__9933 = this;
  if(cljs.core._lookup.call(null, this__9933.transient_map, v, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
    return not_found
  }else {
    return v
  }
};
cljs.core.TransientHashSet.prototype.cljs$core$ICounted$_count$arity$1 = function(tcoll) {
  var this__9934 = this;
  return cljs.core.count.call(null, this__9934.transient_map)
};
cljs.core.TransientHashSet.prototype.cljs$core$ITransientSet$_disjoin_BANG_$arity$2 = function(tcoll, v) {
  var this__9935 = this;
  this__9935.transient_map = cljs.core.dissoc_BANG_.call(null, this__9935.transient_map, v);
  return tcoll
};
cljs.core.TransientHashSet.prototype.cljs$core$ITransientCollection$_conj_BANG_$arity$2 = function(tcoll, o) {
  var this__9936 = this;
  this__9936.transient_map = cljs.core.assoc_BANG_.call(null, this__9936.transient_map, o, null);
  return tcoll
};
cljs.core.TransientHashSet.prototype.cljs$core$ITransientCollection$_persistent_BANG_$arity$1 = function(tcoll) {
  var this__9937 = this;
  return new cljs.core.PersistentHashSet(null, cljs.core.persistent_BANG_.call(null, this__9937.transient_map), null)
};
cljs.core.TransientHashSet;
cljs.core.PersistentTreeSet = function(meta, tree_map, __hash) {
  this.meta = meta;
  this.tree_map = tree_map;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 417730831
};
cljs.core.PersistentTreeSet.cljs$lang$type = true;
cljs.core.PersistentTreeSet.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentTreeSet")
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9941 = this;
  var h__2188__auto____9942 = this__9941.__hash;
  if(!(h__2188__auto____9942 == null)) {
    return h__2188__auto____9942
  }else {
    var h__2188__auto____9943 = cljs.core.hash_iset.call(null, coll);
    this__9941.__hash = h__2188__auto____9943;
    return h__2188__auto____9943
  }
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, v) {
  var this__9944 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, v, null)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, v, not_found) {
  var this__9945 = this;
  if(cljs.core.truth_(cljs.core._contains_key_QMARK_.call(null, this__9945.tree_map, v))) {
    return v
  }else {
    return not_found
  }
};
cljs.core.PersistentTreeSet.prototype.call = function() {
  var G__9971 = null;
  var G__9971__2 = function(this_sym9946, k) {
    var this__9948 = this;
    var this_sym9946__9949 = this;
    var coll__9950 = this_sym9946__9949;
    return coll__9950.cljs$core$ILookup$_lookup$arity$2(coll__9950, k)
  };
  var G__9971__3 = function(this_sym9947, k, not_found) {
    var this__9948 = this;
    var this_sym9947__9951 = this;
    var coll__9952 = this_sym9947__9951;
    return coll__9952.cljs$core$ILookup$_lookup$arity$3(coll__9952, k, not_found)
  };
  G__9971 = function(this_sym9947, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9971__2.call(this, this_sym9947, k);
      case 3:
        return G__9971__3.call(this, this_sym9947, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9971
}();
cljs.core.PersistentTreeSet.prototype.apply = function(this_sym9939, args9940) {
  var this__9953 = this;
  return this_sym9939.call.apply(this_sym9939, [this_sym9939].concat(args9940.slice()))
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__9954 = this;
  return new cljs.core.PersistentTreeSet(this__9954.meta, cljs.core.assoc.call(null, this__9954.tree_map, o, null), null)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var this__9955 = this;
  return cljs.core.map.call(null, cljs.core.key, cljs.core.rseq.call(null, this__9955.tree_map))
};
cljs.core.PersistentTreeSet.prototype.toString = function() {
  var this__9956 = this;
  var this__9957 = this;
  return cljs.core.pr_str.call(null, this__9957)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_sorted_seq$arity$2 = function(coll, ascending_QMARK_) {
  var this__9958 = this;
  return cljs.core.map.call(null, cljs.core.key, cljs.core._sorted_seq.call(null, this__9958.tree_map, ascending_QMARK_))
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_sorted_seq_from$arity$3 = function(coll, k, ascending_QMARK_) {
  var this__9959 = this;
  return cljs.core.map.call(null, cljs.core.key, cljs.core._sorted_seq_from.call(null, this__9959.tree_map, k, ascending_QMARK_))
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_entry_key$arity$2 = function(coll, entry) {
  var this__9960 = this;
  return entry
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_comparator$arity$1 = function(coll) {
  var this__9961 = this;
  return cljs.core._comparator.call(null, this__9961.tree_map)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__9962 = this;
  return cljs.core.keys.call(null, this__9962.tree_map)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISet$_disjoin$arity$2 = function(coll, v) {
  var this__9963 = this;
  return new cljs.core.PersistentTreeSet(this__9963.meta, cljs.core.dissoc.call(null, this__9963.tree_map, v), null)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9964 = this;
  return cljs.core.count.call(null, this__9964.tree_map)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9965 = this;
  var and__3822__auto____9966 = cljs.core.set_QMARK_.call(null, other);
  if(and__3822__auto____9966) {
    var and__3822__auto____9967 = cljs.core.count.call(null, coll) === cljs.core.count.call(null, other);
    if(and__3822__auto____9967) {
      return cljs.core.every_QMARK_.call(null, function(p1__9921_SHARP_) {
        return cljs.core.contains_QMARK_.call(null, coll, p1__9921_SHARP_)
      }, other)
    }else {
      return and__3822__auto____9967
    }
  }else {
    return and__3822__auto____9966
  }
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9968 = this;
  return new cljs.core.PersistentTreeSet(meta, this__9968.tree_map, this__9968.__hash)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9969 = this;
  return this__9969.meta
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9970 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentTreeSet.EMPTY, this__9970.meta)
};
cljs.core.PersistentTreeSet;
cljs.core.PersistentTreeSet.EMPTY = new cljs.core.PersistentTreeSet(null, cljs.core.sorted_map.call(null), 0);
cljs.core.hash_set = function() {
  var hash_set = null;
  var hash_set__0 = function() {
    return cljs.core.PersistentHashSet.EMPTY
  };
  var hash_set__1 = function() {
    var G__9976__delegate = function(keys) {
      var in__9974 = cljs.core.seq.call(null, keys);
      var out__9975 = cljs.core.transient$.call(null, cljs.core.PersistentHashSet.EMPTY);
      while(true) {
        if(cljs.core.seq.call(null, in__9974)) {
          var G__9977 = cljs.core.next.call(null, in__9974);
          var G__9978 = cljs.core.conj_BANG_.call(null, out__9975, cljs.core.first.call(null, in__9974));
          in__9974 = G__9977;
          out__9975 = G__9978;
          continue
        }else {
          return cljs.core.persistent_BANG_.call(null, out__9975)
        }
        break
      }
    };
    var G__9976 = function(var_args) {
      var keys = null;
      if(goog.isDef(var_args)) {
        keys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
      }
      return G__9976__delegate.call(this, keys)
    };
    G__9976.cljs$lang$maxFixedArity = 0;
    G__9976.cljs$lang$applyTo = function(arglist__9979) {
      var keys = cljs.core.seq(arglist__9979);
      return G__9976__delegate(keys)
    };
    G__9976.cljs$lang$arity$variadic = G__9976__delegate;
    return G__9976
  }();
  hash_set = function(var_args) {
    var keys = var_args;
    switch(arguments.length) {
      case 0:
        return hash_set__0.call(this);
      default:
        return hash_set__1.cljs$lang$arity$variadic(cljs.core.array_seq(arguments, 0))
    }
    throw"Invalid arity: " + arguments.length;
  };
  hash_set.cljs$lang$maxFixedArity = 0;
  hash_set.cljs$lang$applyTo = hash_set__1.cljs$lang$applyTo;
  hash_set.cljs$lang$arity$0 = hash_set__0;
  hash_set.cljs$lang$arity$variadic = hash_set__1.cljs$lang$arity$variadic;
  return hash_set
}();
cljs.core.set = function set(coll) {
  return cljs.core.apply.call(null, cljs.core.hash_set, coll)
};
cljs.core.sorted_set = function() {
  var sorted_set__delegate = function(keys) {
    return cljs.core.reduce.call(null, cljs.core._conj, cljs.core.PersistentTreeSet.EMPTY, keys)
  };
  var sorted_set = function(var_args) {
    var keys = null;
    if(goog.isDef(var_args)) {
      keys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return sorted_set__delegate.call(this, keys)
  };
  sorted_set.cljs$lang$maxFixedArity = 0;
  sorted_set.cljs$lang$applyTo = function(arglist__9980) {
    var keys = cljs.core.seq(arglist__9980);
    return sorted_set__delegate(keys)
  };
  sorted_set.cljs$lang$arity$variadic = sorted_set__delegate;
  return sorted_set
}();
cljs.core.sorted_set_by = function() {
  var sorted_set_by__delegate = function(comparator, keys) {
    return cljs.core.reduce.call(null, cljs.core._conj, new cljs.core.PersistentTreeSet(null, cljs.core.sorted_map_by.call(null, comparator), 0), keys)
  };
  var sorted_set_by = function(comparator, var_args) {
    var keys = null;
    if(goog.isDef(var_args)) {
      keys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return sorted_set_by__delegate.call(this, comparator, keys)
  };
  sorted_set_by.cljs$lang$maxFixedArity = 1;
  sorted_set_by.cljs$lang$applyTo = function(arglist__9982) {
    var comparator = cljs.core.first(arglist__9982);
    var keys = cljs.core.rest(arglist__9982);
    return sorted_set_by__delegate(comparator, keys)
  };
  sorted_set_by.cljs$lang$arity$variadic = sorted_set_by__delegate;
  return sorted_set_by
}();
cljs.core.replace = function replace(smap, coll) {
  if(cljs.core.vector_QMARK_.call(null, coll)) {
    var n__9988 = cljs.core.count.call(null, coll);
    return cljs.core.reduce.call(null, function(v, i) {
      var temp__3971__auto____9989 = cljs.core.find.call(null, smap, cljs.core.nth.call(null, v, i));
      if(cljs.core.truth_(temp__3971__auto____9989)) {
        var e__9990 = temp__3971__auto____9989;
        return cljs.core.assoc.call(null, v, i, cljs.core.second.call(null, e__9990))
      }else {
        return v
      }
    }, coll, cljs.core.take.call(null, n__9988, cljs.core.iterate.call(null, cljs.core.inc, 0)))
  }else {
    return cljs.core.map.call(null, function(p1__9981_SHARP_) {
      var temp__3971__auto____9991 = cljs.core.find.call(null, smap, p1__9981_SHARP_);
      if(cljs.core.truth_(temp__3971__auto____9991)) {
        var e__9992 = temp__3971__auto____9991;
        return cljs.core.second.call(null, e__9992)
      }else {
        return p1__9981_SHARP_
      }
    }, coll)
  }
};
cljs.core.distinct = function distinct(coll) {
  var step__10022 = function step(xs, seen) {
    return new cljs.core.LazySeq(null, false, function() {
      return function(p__10015, seen) {
        while(true) {
          var vec__10016__10017 = p__10015;
          var f__10018 = cljs.core.nth.call(null, vec__10016__10017, 0, null);
          var xs__10019 = vec__10016__10017;
          var temp__3974__auto____10020 = cljs.core.seq.call(null, xs__10019);
          if(temp__3974__auto____10020) {
            var s__10021 = temp__3974__auto____10020;
            if(cljs.core.contains_QMARK_.call(null, seen, f__10018)) {
              var G__10023 = cljs.core.rest.call(null, s__10021);
              var G__10024 = seen;
              p__10015 = G__10023;
              seen = G__10024;
              continue
            }else {
              return cljs.core.cons.call(null, f__10018, step.call(null, cljs.core.rest.call(null, s__10021), cljs.core.conj.call(null, seen, f__10018)))
            }
          }else {
            return null
          }
          break
        }
      }.call(null, xs, seen)
    }, null)
  };
  return step__10022.call(null, coll, cljs.core.PersistentHashSet.EMPTY)
};
cljs.core.butlast = function butlast(s) {
  var ret__10027 = cljs.core.PersistentVector.EMPTY;
  var s__10028 = s;
  while(true) {
    if(cljs.core.next.call(null, s__10028)) {
      var G__10029 = cljs.core.conj.call(null, ret__10027, cljs.core.first.call(null, s__10028));
      var G__10030 = cljs.core.next.call(null, s__10028);
      ret__10027 = G__10029;
      s__10028 = G__10030;
      continue
    }else {
      return cljs.core.seq.call(null, ret__10027)
    }
    break
  }
};
cljs.core.name = function name(x) {
  if(cljs.core.string_QMARK_.call(null, x)) {
    return x
  }else {
    if(function() {
      var or__3824__auto____10033 = cljs.core.keyword_QMARK_.call(null, x);
      if(or__3824__auto____10033) {
        return or__3824__auto____10033
      }else {
        return cljs.core.symbol_QMARK_.call(null, x)
      }
    }()) {
      var i__10034 = x.lastIndexOf("/");
      if(i__10034 < 0) {
        return cljs.core.subs.call(null, x, 2)
      }else {
        return cljs.core.subs.call(null, x, i__10034 + 1)
      }
    }else {
      if("\ufdd0'else") {
        throw new Error([cljs.core.str("Doesn't support name: "), cljs.core.str(x)].join(""));
      }else {
        return null
      }
    }
  }
};
cljs.core.namespace = function namespace(x) {
  if(function() {
    var or__3824__auto____10037 = cljs.core.keyword_QMARK_.call(null, x);
    if(or__3824__auto____10037) {
      return or__3824__auto____10037
    }else {
      return cljs.core.symbol_QMARK_.call(null, x)
    }
  }()) {
    var i__10038 = x.lastIndexOf("/");
    if(i__10038 > -1) {
      return cljs.core.subs.call(null, x, 2, i__10038)
    }else {
      return null
    }
  }else {
    throw new Error([cljs.core.str("Doesn't support namespace: "), cljs.core.str(x)].join(""));
  }
};
cljs.core.zipmap = function zipmap(keys, vals) {
  var map__10045 = cljs.core.ObjMap.EMPTY;
  var ks__10046 = cljs.core.seq.call(null, keys);
  var vs__10047 = cljs.core.seq.call(null, vals);
  while(true) {
    if(function() {
      var and__3822__auto____10048 = ks__10046;
      if(and__3822__auto____10048) {
        return vs__10047
      }else {
        return and__3822__auto____10048
      }
    }()) {
      var G__10049 = cljs.core.assoc.call(null, map__10045, cljs.core.first.call(null, ks__10046), cljs.core.first.call(null, vs__10047));
      var G__10050 = cljs.core.next.call(null, ks__10046);
      var G__10051 = cljs.core.next.call(null, vs__10047);
      map__10045 = G__10049;
      ks__10046 = G__10050;
      vs__10047 = G__10051;
      continue
    }else {
      return map__10045
    }
    break
  }
};
cljs.core.max_key = function() {
  var max_key = null;
  var max_key__2 = function(k, x) {
    return x
  };
  var max_key__3 = function(k, x, y) {
    if(k.call(null, x) > k.call(null, y)) {
      return x
    }else {
      return y
    }
  };
  var max_key__4 = function() {
    var G__10054__delegate = function(k, x, y, more) {
      return cljs.core.reduce.call(null, function(p1__10039_SHARP_, p2__10040_SHARP_) {
        return max_key.call(null, k, p1__10039_SHARP_, p2__10040_SHARP_)
      }, max_key.call(null, k, x, y), more)
    };
    var G__10054 = function(k, x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__10054__delegate.call(this, k, x, y, more)
    };
    G__10054.cljs$lang$maxFixedArity = 3;
    G__10054.cljs$lang$applyTo = function(arglist__10055) {
      var k = cljs.core.first(arglist__10055);
      var x = cljs.core.first(cljs.core.next(arglist__10055));
      var y = cljs.core.first(cljs.core.next(cljs.core.next(arglist__10055)));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__10055)));
      return G__10054__delegate(k, x, y, more)
    };
    G__10054.cljs$lang$arity$variadic = G__10054__delegate;
    return G__10054
  }();
  max_key = function(k, x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return max_key__2.call(this, k, x);
      case 3:
        return max_key__3.call(this, k, x, y);
      default:
        return max_key__4.cljs$lang$arity$variadic(k, x, y, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  max_key.cljs$lang$maxFixedArity = 3;
  max_key.cljs$lang$applyTo = max_key__4.cljs$lang$applyTo;
  max_key.cljs$lang$arity$2 = max_key__2;
  max_key.cljs$lang$arity$3 = max_key__3;
  max_key.cljs$lang$arity$variadic = max_key__4.cljs$lang$arity$variadic;
  return max_key
}();
cljs.core.min_key = function() {
  var min_key = null;
  var min_key__2 = function(k, x) {
    return x
  };
  var min_key__3 = function(k, x, y) {
    if(k.call(null, x) < k.call(null, y)) {
      return x
    }else {
      return y
    }
  };
  var min_key__4 = function() {
    var G__10056__delegate = function(k, x, y, more) {
      return cljs.core.reduce.call(null, function(p1__10052_SHARP_, p2__10053_SHARP_) {
        return min_key.call(null, k, p1__10052_SHARP_, p2__10053_SHARP_)
      }, min_key.call(null, k, x, y), more)
    };
    var G__10056 = function(k, x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__10056__delegate.call(this, k, x, y, more)
    };
    G__10056.cljs$lang$maxFixedArity = 3;
    G__10056.cljs$lang$applyTo = function(arglist__10057) {
      var k = cljs.core.first(arglist__10057);
      var x = cljs.core.first(cljs.core.next(arglist__10057));
      var y = cljs.core.first(cljs.core.next(cljs.core.next(arglist__10057)));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__10057)));
      return G__10056__delegate(k, x, y, more)
    };
    G__10056.cljs$lang$arity$variadic = G__10056__delegate;
    return G__10056
  }();
  min_key = function(k, x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return min_key__2.call(this, k, x);
      case 3:
        return min_key__3.call(this, k, x, y);
      default:
        return min_key__4.cljs$lang$arity$variadic(k, x, y, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  min_key.cljs$lang$maxFixedArity = 3;
  min_key.cljs$lang$applyTo = min_key__4.cljs$lang$applyTo;
  min_key.cljs$lang$arity$2 = min_key__2;
  min_key.cljs$lang$arity$3 = min_key__3;
  min_key.cljs$lang$arity$variadic = min_key__4.cljs$lang$arity$variadic;
  return min_key
}();
cljs.core.partition_all = function() {
  var partition_all = null;
  var partition_all__2 = function(n, coll) {
    return partition_all.call(null, n, n, coll)
  };
  var partition_all__3 = function(n, step, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____10060 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____10060) {
        var s__10061 = temp__3974__auto____10060;
        return cljs.core.cons.call(null, cljs.core.take.call(null, n, s__10061), partition_all.call(null, n, step, cljs.core.drop.call(null, step, s__10061)))
      }else {
        return null
      }
    }, null)
  };
  partition_all = function(n, step, coll) {
    switch(arguments.length) {
      case 2:
        return partition_all__2.call(this, n, step);
      case 3:
        return partition_all__3.call(this, n, step, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  partition_all.cljs$lang$arity$2 = partition_all__2;
  partition_all.cljs$lang$arity$3 = partition_all__3;
  return partition_all
}();
cljs.core.take_while = function take_while(pred, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____10064 = cljs.core.seq.call(null, coll);
    if(temp__3974__auto____10064) {
      var s__10065 = temp__3974__auto____10064;
      if(cljs.core.truth_(pred.call(null, cljs.core.first.call(null, s__10065)))) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, s__10065), take_while.call(null, pred, cljs.core.rest.call(null, s__10065)))
      }else {
        return null
      }
    }else {
      return null
    }
  }, null)
};
cljs.core.mk_bound_fn = function mk_bound_fn(sc, test, key) {
  return function(e) {
    var comp__10067 = cljs.core._comparator.call(null, sc);
    return test.call(null, comp__10067.call(null, cljs.core._entry_key.call(null, sc, e), key), 0)
  }
};
cljs.core.subseq = function() {
  var subseq = null;
  var subseq__3 = function(sc, test, key) {
    var include__10079 = cljs.core.mk_bound_fn.call(null, sc, test, key);
    if(cljs.core.truth_(cljs.core.PersistentHashSet.fromArray([cljs.core._GT_, cljs.core._GT__EQ_]).call(null, test))) {
      var temp__3974__auto____10080 = cljs.core._sorted_seq_from.call(null, sc, key, true);
      if(cljs.core.truth_(temp__3974__auto____10080)) {
        var vec__10081__10082 = temp__3974__auto____10080;
        var e__10083 = cljs.core.nth.call(null, vec__10081__10082, 0, null);
        var s__10084 = vec__10081__10082;
        if(cljs.core.truth_(include__10079.call(null, e__10083))) {
          return s__10084
        }else {
          return cljs.core.next.call(null, s__10084)
        }
      }else {
        return null
      }
    }else {
      return cljs.core.take_while.call(null, include__10079, cljs.core._sorted_seq.call(null, sc, true))
    }
  };
  var subseq__5 = function(sc, start_test, start_key, end_test, end_key) {
    var temp__3974__auto____10085 = cljs.core._sorted_seq_from.call(null, sc, start_key, true);
    if(cljs.core.truth_(temp__3974__auto____10085)) {
      var vec__10086__10087 = temp__3974__auto____10085;
      var e__10088 = cljs.core.nth.call(null, vec__10086__10087, 0, null);
      var s__10089 = vec__10086__10087;
      return cljs.core.take_while.call(null, cljs.core.mk_bound_fn.call(null, sc, end_test, end_key), cljs.core.truth_(cljs.core.mk_bound_fn.call(null, sc, start_test, start_key).call(null, e__10088)) ? s__10089 : cljs.core.next.call(null, s__10089))
    }else {
      return null
    }
  };
  subseq = function(sc, start_test, start_key, end_test, end_key) {
    switch(arguments.length) {
      case 3:
        return subseq__3.call(this, sc, start_test, start_key);
      case 5:
        return subseq__5.call(this, sc, start_test, start_key, end_test, end_key)
    }
    throw"Invalid arity: " + arguments.length;
  };
  subseq.cljs$lang$arity$3 = subseq__3;
  subseq.cljs$lang$arity$5 = subseq__5;
  return subseq
}();
cljs.core.rsubseq = function() {
  var rsubseq = null;
  var rsubseq__3 = function(sc, test, key) {
    var include__10101 = cljs.core.mk_bound_fn.call(null, sc, test, key);
    if(cljs.core.truth_(cljs.core.PersistentHashSet.fromArray([cljs.core._LT_, cljs.core._LT__EQ_]).call(null, test))) {
      var temp__3974__auto____10102 = cljs.core._sorted_seq_from.call(null, sc, key, false);
      if(cljs.core.truth_(temp__3974__auto____10102)) {
        var vec__10103__10104 = temp__3974__auto____10102;
        var e__10105 = cljs.core.nth.call(null, vec__10103__10104, 0, null);
        var s__10106 = vec__10103__10104;
        if(cljs.core.truth_(include__10101.call(null, e__10105))) {
          return s__10106
        }else {
          return cljs.core.next.call(null, s__10106)
        }
      }else {
        return null
      }
    }else {
      return cljs.core.take_while.call(null, include__10101, cljs.core._sorted_seq.call(null, sc, false))
    }
  };
  var rsubseq__5 = function(sc, start_test, start_key, end_test, end_key) {
    var temp__3974__auto____10107 = cljs.core._sorted_seq_from.call(null, sc, end_key, false);
    if(cljs.core.truth_(temp__3974__auto____10107)) {
      var vec__10108__10109 = temp__3974__auto____10107;
      var e__10110 = cljs.core.nth.call(null, vec__10108__10109, 0, null);
      var s__10111 = vec__10108__10109;
      return cljs.core.take_while.call(null, cljs.core.mk_bound_fn.call(null, sc, start_test, start_key), cljs.core.truth_(cljs.core.mk_bound_fn.call(null, sc, end_test, end_key).call(null, e__10110)) ? s__10111 : cljs.core.next.call(null, s__10111))
    }else {
      return null
    }
  };
  rsubseq = function(sc, start_test, start_key, end_test, end_key) {
    switch(arguments.length) {
      case 3:
        return rsubseq__3.call(this, sc, start_test, start_key);
      case 5:
        return rsubseq__5.call(this, sc, start_test, start_key, end_test, end_key)
    }
    throw"Invalid arity: " + arguments.length;
  };
  rsubseq.cljs$lang$arity$3 = rsubseq__3;
  rsubseq.cljs$lang$arity$5 = rsubseq__5;
  return rsubseq
}();
cljs.core.Range = function(meta, start, end, step, __hash) {
  this.meta = meta;
  this.start = start;
  this.end = end;
  this.step = step;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32375006
};
cljs.core.Range.cljs$lang$type = true;
cljs.core.Range.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/Range")
};
cljs.core.Range.prototype.cljs$core$IHash$_hash$arity$1 = function(rng) {
  var this__10112 = this;
  var h__2188__auto____10113 = this__10112.__hash;
  if(!(h__2188__auto____10113 == null)) {
    return h__2188__auto____10113
  }else {
    var h__2188__auto____10114 = cljs.core.hash_coll.call(null, rng);
    this__10112.__hash = h__2188__auto____10114;
    return h__2188__auto____10114
  }
};
cljs.core.Range.prototype.cljs$core$INext$_next$arity$1 = function(rng) {
  var this__10115 = this;
  if(this__10115.step > 0) {
    if(this__10115.start + this__10115.step < this__10115.end) {
      return new cljs.core.Range(this__10115.meta, this__10115.start + this__10115.step, this__10115.end, this__10115.step, null)
    }else {
      return null
    }
  }else {
    if(this__10115.start + this__10115.step > this__10115.end) {
      return new cljs.core.Range(this__10115.meta, this__10115.start + this__10115.step, this__10115.end, this__10115.step, null)
    }else {
      return null
    }
  }
};
cljs.core.Range.prototype.cljs$core$ICollection$_conj$arity$2 = function(rng, o) {
  var this__10116 = this;
  return cljs.core.cons.call(null, o, rng)
};
cljs.core.Range.prototype.toString = function() {
  var this__10117 = this;
  var this__10118 = this;
  return cljs.core.pr_str.call(null, this__10118)
};
cljs.core.Range.prototype.cljs$core$IReduce$_reduce$arity$2 = function(rng, f) {
  var this__10119 = this;
  return cljs.core.ci_reduce.call(null, rng, f)
};
cljs.core.Range.prototype.cljs$core$IReduce$_reduce$arity$3 = function(rng, f, s) {
  var this__10120 = this;
  return cljs.core.ci_reduce.call(null, rng, f, s)
};
cljs.core.Range.prototype.cljs$core$ISeqable$_seq$arity$1 = function(rng) {
  var this__10121 = this;
  if(this__10121.step > 0) {
    if(this__10121.start < this__10121.end) {
      return rng
    }else {
      return null
    }
  }else {
    if(this__10121.start > this__10121.end) {
      return rng
    }else {
      return null
    }
  }
};
cljs.core.Range.prototype.cljs$core$ICounted$_count$arity$1 = function(rng) {
  var this__10122 = this;
  if(cljs.core.not.call(null, rng.cljs$core$ISeqable$_seq$arity$1(rng))) {
    return 0
  }else {
    return Math.ceil((this__10122.end - this__10122.start) / this__10122.step)
  }
};
cljs.core.Range.prototype.cljs$core$ISeq$_first$arity$1 = function(rng) {
  var this__10123 = this;
  return this__10123.start
};
cljs.core.Range.prototype.cljs$core$ISeq$_rest$arity$1 = function(rng) {
  var this__10124 = this;
  if(!(rng.cljs$core$ISeqable$_seq$arity$1(rng) == null)) {
    return new cljs.core.Range(this__10124.meta, this__10124.start + this__10124.step, this__10124.end, this__10124.step, null)
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.Range.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(rng, other) {
  var this__10125 = this;
  return cljs.core.equiv_sequential.call(null, rng, other)
};
cljs.core.Range.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(rng, meta) {
  var this__10126 = this;
  return new cljs.core.Range(meta, this__10126.start, this__10126.end, this__10126.step, this__10126.__hash)
};
cljs.core.Range.prototype.cljs$core$IMeta$_meta$arity$1 = function(rng) {
  var this__10127 = this;
  return this__10127.meta
};
cljs.core.Range.prototype.cljs$core$IIndexed$_nth$arity$2 = function(rng, n) {
  var this__10128 = this;
  if(n < rng.cljs$core$ICounted$_count$arity$1(rng)) {
    return this__10128.start + n * this__10128.step
  }else {
    if(function() {
      var and__3822__auto____10129 = this__10128.start > this__10128.end;
      if(and__3822__auto____10129) {
        return this__10128.step === 0
      }else {
        return and__3822__auto____10129
      }
    }()) {
      return this__10128.start
    }else {
      throw new Error("Index out of bounds");
    }
  }
};
cljs.core.Range.prototype.cljs$core$IIndexed$_nth$arity$3 = function(rng, n, not_found) {
  var this__10130 = this;
  if(n < rng.cljs$core$ICounted$_count$arity$1(rng)) {
    return this__10130.start + n * this__10130.step
  }else {
    if(function() {
      var and__3822__auto____10131 = this__10130.start > this__10130.end;
      if(and__3822__auto____10131) {
        return this__10130.step === 0
      }else {
        return and__3822__auto____10131
      }
    }()) {
      return this__10130.start
    }else {
      return not_found
    }
  }
};
cljs.core.Range.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(rng) {
  var this__10132 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__10132.meta)
};
cljs.core.Range;
cljs.core.range = function() {
  var range = null;
  var range__0 = function() {
    return range.call(null, 0, Number.MAX_VALUE, 1)
  };
  var range__1 = function(end) {
    return range.call(null, 0, end, 1)
  };
  var range__2 = function(start, end) {
    return range.call(null, start, end, 1)
  };
  var range__3 = function(start, end, step) {
    return new cljs.core.Range(null, start, end, step, null)
  };
  range = function(start, end, step) {
    switch(arguments.length) {
      case 0:
        return range__0.call(this);
      case 1:
        return range__1.call(this, start);
      case 2:
        return range__2.call(this, start, end);
      case 3:
        return range__3.call(this, start, end, step)
    }
    throw"Invalid arity: " + arguments.length;
  };
  range.cljs$lang$arity$0 = range__0;
  range.cljs$lang$arity$1 = range__1;
  range.cljs$lang$arity$2 = range__2;
  range.cljs$lang$arity$3 = range__3;
  return range
}();
cljs.core.take_nth = function take_nth(n, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____10135 = cljs.core.seq.call(null, coll);
    if(temp__3974__auto____10135) {
      var s__10136 = temp__3974__auto____10135;
      return cljs.core.cons.call(null, cljs.core.first.call(null, s__10136), take_nth.call(null, n, cljs.core.drop.call(null, n, s__10136)))
    }else {
      return null
    }
  }, null)
};
cljs.core.split_with = function split_with(pred, coll) {
  return cljs.core.PersistentVector.fromArray([cljs.core.take_while.call(null, pred, coll), cljs.core.drop_while.call(null, pred, coll)], true)
};
cljs.core.partition_by = function partition_by(f, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____10143 = cljs.core.seq.call(null, coll);
    if(temp__3974__auto____10143) {
      var s__10144 = temp__3974__auto____10143;
      var fst__10145 = cljs.core.first.call(null, s__10144);
      var fv__10146 = f.call(null, fst__10145);
      var run__10147 = cljs.core.cons.call(null, fst__10145, cljs.core.take_while.call(null, function(p1__10137_SHARP_) {
        return cljs.core._EQ_.call(null, fv__10146, f.call(null, p1__10137_SHARP_))
      }, cljs.core.next.call(null, s__10144)));
      return cljs.core.cons.call(null, run__10147, partition_by.call(null, f, cljs.core.seq.call(null, cljs.core.drop.call(null, cljs.core.count.call(null, run__10147), s__10144))))
    }else {
      return null
    }
  }, null)
};
cljs.core.frequencies = function frequencies(coll) {
  return cljs.core.persistent_BANG_.call(null, cljs.core.reduce.call(null, function(counts, x) {
    return cljs.core.assoc_BANG_.call(null, counts, x, cljs.core._lookup.call(null, counts, x, 0) + 1)
  }, cljs.core.transient$.call(null, cljs.core.ObjMap.EMPTY), coll))
};
cljs.core.reductions = function() {
  var reductions = null;
  var reductions__2 = function(f, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3971__auto____10162 = cljs.core.seq.call(null, coll);
      if(temp__3971__auto____10162) {
        var s__10163 = temp__3971__auto____10162;
        return reductions.call(null, f, cljs.core.first.call(null, s__10163), cljs.core.rest.call(null, s__10163))
      }else {
        return cljs.core.list.call(null, f.call(null))
      }
    }, null)
  };
  var reductions__3 = function(f, init, coll) {
    return cljs.core.cons.call(null, init, new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____10164 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____10164) {
        var s__10165 = temp__3974__auto____10164;
        return reductions.call(null, f, f.call(null, init, cljs.core.first.call(null, s__10165)), cljs.core.rest.call(null, s__10165))
      }else {
        return null
      }
    }, null))
  };
  reductions = function(f, init, coll) {
    switch(arguments.length) {
      case 2:
        return reductions__2.call(this, f, init);
      case 3:
        return reductions__3.call(this, f, init, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  reductions.cljs$lang$arity$2 = reductions__2;
  reductions.cljs$lang$arity$3 = reductions__3;
  return reductions
}();
cljs.core.juxt = function() {
  var juxt = null;
  var juxt__1 = function(f) {
    return function() {
      var G__10168 = null;
      var G__10168__0 = function() {
        return cljs.core.vector.call(null, f.call(null))
      };
      var G__10168__1 = function(x) {
        return cljs.core.vector.call(null, f.call(null, x))
      };
      var G__10168__2 = function(x, y) {
        return cljs.core.vector.call(null, f.call(null, x, y))
      };
      var G__10168__3 = function(x, y, z) {
        return cljs.core.vector.call(null, f.call(null, x, y, z))
      };
      var G__10168__4 = function() {
        var G__10169__delegate = function(x, y, z, args) {
          return cljs.core.vector.call(null, cljs.core.apply.call(null, f, x, y, z, args))
        };
        var G__10169 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__10169__delegate.call(this, x, y, z, args)
        };
        G__10169.cljs$lang$maxFixedArity = 3;
        G__10169.cljs$lang$applyTo = function(arglist__10170) {
          var x = cljs.core.first(arglist__10170);
          var y = cljs.core.first(cljs.core.next(arglist__10170));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__10170)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__10170)));
          return G__10169__delegate(x, y, z, args)
        };
        G__10169.cljs$lang$arity$variadic = G__10169__delegate;
        return G__10169
      }();
      G__10168 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__10168__0.call(this);
          case 1:
            return G__10168__1.call(this, x);
          case 2:
            return G__10168__2.call(this, x, y);
          case 3:
            return G__10168__3.call(this, x, y, z);
          default:
            return G__10168__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__10168.cljs$lang$maxFixedArity = 3;
      G__10168.cljs$lang$applyTo = G__10168__4.cljs$lang$applyTo;
      return G__10168
    }()
  };
  var juxt__2 = function(f, g) {
    return function() {
      var G__10171 = null;
      var G__10171__0 = function() {
        return cljs.core.vector.call(null, f.call(null), g.call(null))
      };
      var G__10171__1 = function(x) {
        return cljs.core.vector.call(null, f.call(null, x), g.call(null, x))
      };
      var G__10171__2 = function(x, y) {
        return cljs.core.vector.call(null, f.call(null, x, y), g.call(null, x, y))
      };
      var G__10171__3 = function(x, y, z) {
        return cljs.core.vector.call(null, f.call(null, x, y, z), g.call(null, x, y, z))
      };
      var G__10171__4 = function() {
        var G__10172__delegate = function(x, y, z, args) {
          return cljs.core.vector.call(null, cljs.core.apply.call(null, f, x, y, z, args), cljs.core.apply.call(null, g, x, y, z, args))
        };
        var G__10172 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__10172__delegate.call(this, x, y, z, args)
        };
        G__10172.cljs$lang$maxFixedArity = 3;
        G__10172.cljs$lang$applyTo = function(arglist__10173) {
          var x = cljs.core.first(arglist__10173);
          var y = cljs.core.first(cljs.core.next(arglist__10173));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__10173)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__10173)));
          return G__10172__delegate(x, y, z, args)
        };
        G__10172.cljs$lang$arity$variadic = G__10172__delegate;
        return G__10172
      }();
      G__10171 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__10171__0.call(this);
          case 1:
            return G__10171__1.call(this, x);
          case 2:
            return G__10171__2.call(this, x, y);
          case 3:
            return G__10171__3.call(this, x, y, z);
          default:
            return G__10171__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__10171.cljs$lang$maxFixedArity = 3;
      G__10171.cljs$lang$applyTo = G__10171__4.cljs$lang$applyTo;
      return G__10171
    }()
  };
  var juxt__3 = function(f, g, h) {
    return function() {
      var G__10174 = null;
      var G__10174__0 = function() {
        return cljs.core.vector.call(null, f.call(null), g.call(null), h.call(null))
      };
      var G__10174__1 = function(x) {
        return cljs.core.vector.call(null, f.call(null, x), g.call(null, x), h.call(null, x))
      };
      var G__10174__2 = function(x, y) {
        return cljs.core.vector.call(null, f.call(null, x, y), g.call(null, x, y), h.call(null, x, y))
      };
      var G__10174__3 = function(x, y, z) {
        return cljs.core.vector.call(null, f.call(null, x, y, z), g.call(null, x, y, z), h.call(null, x, y, z))
      };
      var G__10174__4 = function() {
        var G__10175__delegate = function(x, y, z, args) {
          return cljs.core.vector.call(null, cljs.core.apply.call(null, f, x, y, z, args), cljs.core.apply.call(null, g, x, y, z, args), cljs.core.apply.call(null, h, x, y, z, args))
        };
        var G__10175 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__10175__delegate.call(this, x, y, z, args)
        };
        G__10175.cljs$lang$maxFixedArity = 3;
        G__10175.cljs$lang$applyTo = function(arglist__10176) {
          var x = cljs.core.first(arglist__10176);
          var y = cljs.core.first(cljs.core.next(arglist__10176));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__10176)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__10176)));
          return G__10175__delegate(x, y, z, args)
        };
        G__10175.cljs$lang$arity$variadic = G__10175__delegate;
        return G__10175
      }();
      G__10174 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__10174__0.call(this);
          case 1:
            return G__10174__1.call(this, x);
          case 2:
            return G__10174__2.call(this, x, y);
          case 3:
            return G__10174__3.call(this, x, y, z);
          default:
            return G__10174__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__10174.cljs$lang$maxFixedArity = 3;
      G__10174.cljs$lang$applyTo = G__10174__4.cljs$lang$applyTo;
      return G__10174
    }()
  };
  var juxt__4 = function() {
    var G__10177__delegate = function(f, g, h, fs) {
      var fs__10167 = cljs.core.list_STAR_.call(null, f, g, h, fs);
      return function() {
        var G__10178 = null;
        var G__10178__0 = function() {
          return cljs.core.reduce.call(null, function(p1__10148_SHARP_, p2__10149_SHARP_) {
            return cljs.core.conj.call(null, p1__10148_SHARP_, p2__10149_SHARP_.call(null))
          }, cljs.core.PersistentVector.EMPTY, fs__10167)
        };
        var G__10178__1 = function(x) {
          return cljs.core.reduce.call(null, function(p1__10150_SHARP_, p2__10151_SHARP_) {
            return cljs.core.conj.call(null, p1__10150_SHARP_, p2__10151_SHARP_.call(null, x))
          }, cljs.core.PersistentVector.EMPTY, fs__10167)
        };
        var G__10178__2 = function(x, y) {
          return cljs.core.reduce.call(null, function(p1__10152_SHARP_, p2__10153_SHARP_) {
            return cljs.core.conj.call(null, p1__10152_SHARP_, p2__10153_SHARP_.call(null, x, y))
          }, cljs.core.PersistentVector.EMPTY, fs__10167)
        };
        var G__10178__3 = function(x, y, z) {
          return cljs.core.reduce.call(null, function(p1__10154_SHARP_, p2__10155_SHARP_) {
            return cljs.core.conj.call(null, p1__10154_SHARP_, p2__10155_SHARP_.call(null, x, y, z))
          }, cljs.core.PersistentVector.EMPTY, fs__10167)
        };
        var G__10178__4 = function() {
          var G__10179__delegate = function(x, y, z, args) {
            return cljs.core.reduce.call(null, function(p1__10156_SHARP_, p2__10157_SHARP_) {
              return cljs.core.conj.call(null, p1__10156_SHARP_, cljs.core.apply.call(null, p2__10157_SHARP_, x, y, z, args))
            }, cljs.core.PersistentVector.EMPTY, fs__10167)
          };
          var G__10179 = function(x, y, z, var_args) {
            var args = null;
            if(goog.isDef(var_args)) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
            }
            return G__10179__delegate.call(this, x, y, z, args)
          };
          G__10179.cljs$lang$maxFixedArity = 3;
          G__10179.cljs$lang$applyTo = function(arglist__10180) {
            var x = cljs.core.first(arglist__10180);
            var y = cljs.core.first(cljs.core.next(arglist__10180));
            var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__10180)));
            var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__10180)));
            return G__10179__delegate(x, y, z, args)
          };
          G__10179.cljs$lang$arity$variadic = G__10179__delegate;
          return G__10179
        }();
        G__10178 = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return G__10178__0.call(this);
            case 1:
              return G__10178__1.call(this, x);
            case 2:
              return G__10178__2.call(this, x, y);
            case 3:
              return G__10178__3.call(this, x, y, z);
            default:
              return G__10178__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
          }
          throw"Invalid arity: " + arguments.length;
        };
        G__10178.cljs$lang$maxFixedArity = 3;
        G__10178.cljs$lang$applyTo = G__10178__4.cljs$lang$applyTo;
        return G__10178
      }()
    };
    var G__10177 = function(f, g, h, var_args) {
      var fs = null;
      if(goog.isDef(var_args)) {
        fs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__10177__delegate.call(this, f, g, h, fs)
    };
    G__10177.cljs$lang$maxFixedArity = 3;
    G__10177.cljs$lang$applyTo = function(arglist__10181) {
      var f = cljs.core.first(arglist__10181);
      var g = cljs.core.first(cljs.core.next(arglist__10181));
      var h = cljs.core.first(cljs.core.next(cljs.core.next(arglist__10181)));
      var fs = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__10181)));
      return G__10177__delegate(f, g, h, fs)
    };
    G__10177.cljs$lang$arity$variadic = G__10177__delegate;
    return G__10177
  }();
  juxt = function(f, g, h, var_args) {
    var fs = var_args;
    switch(arguments.length) {
      case 1:
        return juxt__1.call(this, f);
      case 2:
        return juxt__2.call(this, f, g);
      case 3:
        return juxt__3.call(this, f, g, h);
      default:
        return juxt__4.cljs$lang$arity$variadic(f, g, h, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  juxt.cljs$lang$maxFixedArity = 3;
  juxt.cljs$lang$applyTo = juxt__4.cljs$lang$applyTo;
  juxt.cljs$lang$arity$1 = juxt__1;
  juxt.cljs$lang$arity$2 = juxt__2;
  juxt.cljs$lang$arity$3 = juxt__3;
  juxt.cljs$lang$arity$variadic = juxt__4.cljs$lang$arity$variadic;
  return juxt
}();
cljs.core.dorun = function() {
  var dorun = null;
  var dorun__1 = function(coll) {
    while(true) {
      if(cljs.core.seq.call(null, coll)) {
        var G__10184 = cljs.core.next.call(null, coll);
        coll = G__10184;
        continue
      }else {
        return null
      }
      break
    }
  };
  var dorun__2 = function(n, coll) {
    while(true) {
      if(cljs.core.truth_(function() {
        var and__3822__auto____10183 = cljs.core.seq.call(null, coll);
        if(and__3822__auto____10183) {
          return n > 0
        }else {
          return and__3822__auto____10183
        }
      }())) {
        var G__10185 = n - 1;
        var G__10186 = cljs.core.next.call(null, coll);
        n = G__10185;
        coll = G__10186;
        continue
      }else {
        return null
      }
      break
    }
  };
  dorun = function(n, coll) {
    switch(arguments.length) {
      case 1:
        return dorun__1.call(this, n);
      case 2:
        return dorun__2.call(this, n, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  dorun.cljs$lang$arity$1 = dorun__1;
  dorun.cljs$lang$arity$2 = dorun__2;
  return dorun
}();
cljs.core.doall = function() {
  var doall = null;
  var doall__1 = function(coll) {
    cljs.core.dorun.call(null, coll);
    return coll
  };
  var doall__2 = function(n, coll) {
    cljs.core.dorun.call(null, n, coll);
    return coll
  };
  doall = function(n, coll) {
    switch(arguments.length) {
      case 1:
        return doall__1.call(this, n);
      case 2:
        return doall__2.call(this, n, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  doall.cljs$lang$arity$1 = doall__1;
  doall.cljs$lang$arity$2 = doall__2;
  return doall
}();
cljs.core.regexp_QMARK_ = function regexp_QMARK_(o) {
  return o instanceof RegExp
};
cljs.core.re_matches = function re_matches(re, s) {
  var matches__10188 = re.exec(s);
  if(cljs.core._EQ_.call(null, cljs.core.first.call(null, matches__10188), s)) {
    if(cljs.core.count.call(null, matches__10188) === 1) {
      return cljs.core.first.call(null, matches__10188)
    }else {
      return cljs.core.vec.call(null, matches__10188)
    }
  }else {
    return null
  }
};
cljs.core.re_find = function re_find(re, s) {
  var matches__10190 = re.exec(s);
  if(matches__10190 == null) {
    return null
  }else {
    if(cljs.core.count.call(null, matches__10190) === 1) {
      return cljs.core.first.call(null, matches__10190)
    }else {
      return cljs.core.vec.call(null, matches__10190)
    }
  }
};
cljs.core.re_seq = function re_seq(re, s) {
  var match_data__10195 = cljs.core.re_find.call(null, re, s);
  var match_idx__10196 = s.search(re);
  var match_str__10197 = cljs.core.coll_QMARK_.call(null, match_data__10195) ? cljs.core.first.call(null, match_data__10195) : match_data__10195;
  var post_match__10198 = cljs.core.subs.call(null, s, match_idx__10196 + cljs.core.count.call(null, match_str__10197));
  if(cljs.core.truth_(match_data__10195)) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, match_data__10195, re_seq.call(null, re, post_match__10198))
    }, null)
  }else {
    return null
  }
};
cljs.core.re_pattern = function re_pattern(s) {
  var vec__10205__10206 = cljs.core.re_find.call(null, /^(?:\(\?([idmsux]*)\))?(.*)/, s);
  var ___10207 = cljs.core.nth.call(null, vec__10205__10206, 0, null);
  var flags__10208 = cljs.core.nth.call(null, vec__10205__10206, 1, null);
  var pattern__10209 = cljs.core.nth.call(null, vec__10205__10206, 2, null);
  return new RegExp(pattern__10209, flags__10208)
};
cljs.core.pr_sequential = function pr_sequential(print_one, begin, sep, end, opts, coll) {
  return cljs.core.concat.call(null, cljs.core.PersistentVector.fromArray([begin], true), cljs.core.flatten1.call(null, cljs.core.interpose.call(null, cljs.core.PersistentVector.fromArray([sep], true), cljs.core.map.call(null, function(p1__10199_SHARP_) {
    return print_one.call(null, p1__10199_SHARP_, opts)
  }, coll))), cljs.core.PersistentVector.fromArray([end], true))
};
cljs.core.string_print = function string_print(x) {
  cljs.core._STAR_print_fn_STAR_.call(null, x);
  return null
};
cljs.core.flush = function flush() {
  return null
};
cljs.core.pr_seq = function pr_seq(obj, opts) {
  if(obj == null) {
    return cljs.core.list.call(null, "nil")
  }else {
    if(void 0 === obj) {
      return cljs.core.list.call(null, "#<undefined>")
    }else {
      if("\ufdd0'else") {
        return cljs.core.concat.call(null, cljs.core.truth_(function() {
          var and__3822__auto____10219 = cljs.core._lookup.call(null, opts, "\ufdd0'meta", null);
          if(cljs.core.truth_(and__3822__auto____10219)) {
            var and__3822__auto____10223 = function() {
              var G__10220__10221 = obj;
              if(G__10220__10221) {
                if(function() {
                  var or__3824__auto____10222 = G__10220__10221.cljs$lang$protocol_mask$partition0$ & 131072;
                  if(or__3824__auto____10222) {
                    return or__3824__auto____10222
                  }else {
                    return G__10220__10221.cljs$core$IMeta$
                  }
                }()) {
                  return true
                }else {
                  if(!G__10220__10221.cljs$lang$protocol_mask$partition0$) {
                    return cljs.core.type_satisfies_.call(null, cljs.core.IMeta, G__10220__10221)
                  }else {
                    return false
                  }
                }
              }else {
                return cljs.core.type_satisfies_.call(null, cljs.core.IMeta, G__10220__10221)
              }
            }();
            if(cljs.core.truth_(and__3822__auto____10223)) {
              return cljs.core.meta.call(null, obj)
            }else {
              return and__3822__auto____10223
            }
          }else {
            return and__3822__auto____10219
          }
        }()) ? cljs.core.concat.call(null, cljs.core.PersistentVector.fromArray(["^"], true), pr_seq.call(null, cljs.core.meta.call(null, obj), opts), cljs.core.PersistentVector.fromArray([" "], true)) : null, function() {
          var and__3822__auto____10224 = !(obj == null);
          if(and__3822__auto____10224) {
            return obj.cljs$lang$type
          }else {
            return and__3822__auto____10224
          }
        }() ? obj.cljs$lang$ctorPrSeq(obj) : function() {
          var G__10225__10226 = obj;
          if(G__10225__10226) {
            if(function() {
              var or__3824__auto____10227 = G__10225__10226.cljs$lang$protocol_mask$partition0$ & 536870912;
              if(or__3824__auto____10227) {
                return or__3824__auto____10227
              }else {
                return G__10225__10226.cljs$core$IPrintable$
              }
            }()) {
              return true
            }else {
              if(!G__10225__10226.cljs$lang$protocol_mask$partition0$) {
                return cljs.core.type_satisfies_.call(null, cljs.core.IPrintable, G__10225__10226)
              }else {
                return false
              }
            }
          }else {
            return cljs.core.type_satisfies_.call(null, cljs.core.IPrintable, G__10225__10226)
          }
        }() ? cljs.core._pr_seq.call(null, obj, opts) : cljs.core.truth_(cljs.core.regexp_QMARK_.call(null, obj)) ? cljs.core.list.call(null, '#"', obj.source, '"') : "\ufdd0'else" ? cljs.core.list.call(null, "#<", [cljs.core.str(obj)].join(""), ">") : null)
      }else {
        return null
      }
    }
  }
};
cljs.core.pr_sb = function pr_sb(objs, opts) {
  var sb__10247 = new goog.string.StringBuffer;
  var G__10248__10249 = cljs.core.seq.call(null, cljs.core.pr_seq.call(null, cljs.core.first.call(null, objs), opts));
  if(G__10248__10249) {
    var string__10250 = cljs.core.first.call(null, G__10248__10249);
    var G__10248__10251 = G__10248__10249;
    while(true) {
      sb__10247.append(string__10250);
      var temp__3974__auto____10252 = cljs.core.next.call(null, G__10248__10251);
      if(temp__3974__auto____10252) {
        var G__10248__10253 = temp__3974__auto____10252;
        var G__10266 = cljs.core.first.call(null, G__10248__10253);
        var G__10267 = G__10248__10253;
        string__10250 = G__10266;
        G__10248__10251 = G__10267;
        continue
      }else {
      }
      break
    }
  }else {
  }
  var G__10254__10255 = cljs.core.seq.call(null, cljs.core.next.call(null, objs));
  if(G__10254__10255) {
    var obj__10256 = cljs.core.first.call(null, G__10254__10255);
    var G__10254__10257 = G__10254__10255;
    while(true) {
      sb__10247.append(" ");
      var G__10258__10259 = cljs.core.seq.call(null, cljs.core.pr_seq.call(null, obj__10256, opts));
      if(G__10258__10259) {
        var string__10260 = cljs.core.first.call(null, G__10258__10259);
        var G__10258__10261 = G__10258__10259;
        while(true) {
          sb__10247.append(string__10260);
          var temp__3974__auto____10262 = cljs.core.next.call(null, G__10258__10261);
          if(temp__3974__auto____10262) {
            var G__10258__10263 = temp__3974__auto____10262;
            var G__10268 = cljs.core.first.call(null, G__10258__10263);
            var G__10269 = G__10258__10263;
            string__10260 = G__10268;
            G__10258__10261 = G__10269;
            continue
          }else {
          }
          break
        }
      }else {
      }
      var temp__3974__auto____10264 = cljs.core.next.call(null, G__10254__10257);
      if(temp__3974__auto____10264) {
        var G__10254__10265 = temp__3974__auto____10264;
        var G__10270 = cljs.core.first.call(null, G__10254__10265);
        var G__10271 = G__10254__10265;
        obj__10256 = G__10270;
        G__10254__10257 = G__10271;
        continue
      }else {
      }
      break
    }
  }else {
  }
  return sb__10247
};
cljs.core.pr_str_with_opts = function pr_str_with_opts(objs, opts) {
  return[cljs.core.str(cljs.core.pr_sb.call(null, objs, opts))].join("")
};
cljs.core.prn_str_with_opts = function prn_str_with_opts(objs, opts) {
  var sb__10273 = cljs.core.pr_sb.call(null, objs, opts);
  sb__10273.append("\n");
  return[cljs.core.str(sb__10273)].join("")
};
cljs.core.pr_with_opts = function pr_with_opts(objs, opts) {
  var G__10292__10293 = cljs.core.seq.call(null, cljs.core.pr_seq.call(null, cljs.core.first.call(null, objs), opts));
  if(G__10292__10293) {
    var string__10294 = cljs.core.first.call(null, G__10292__10293);
    var G__10292__10295 = G__10292__10293;
    while(true) {
      cljs.core.string_print.call(null, string__10294);
      var temp__3974__auto____10296 = cljs.core.next.call(null, G__10292__10295);
      if(temp__3974__auto____10296) {
        var G__10292__10297 = temp__3974__auto____10296;
        var G__10310 = cljs.core.first.call(null, G__10292__10297);
        var G__10311 = G__10292__10297;
        string__10294 = G__10310;
        G__10292__10295 = G__10311;
        continue
      }else {
      }
      break
    }
  }else {
  }
  var G__10298__10299 = cljs.core.seq.call(null, cljs.core.next.call(null, objs));
  if(G__10298__10299) {
    var obj__10300 = cljs.core.first.call(null, G__10298__10299);
    var G__10298__10301 = G__10298__10299;
    while(true) {
      cljs.core.string_print.call(null, " ");
      var G__10302__10303 = cljs.core.seq.call(null, cljs.core.pr_seq.call(null, obj__10300, opts));
      if(G__10302__10303) {
        var string__10304 = cljs.core.first.call(null, G__10302__10303);
        var G__10302__10305 = G__10302__10303;
        while(true) {
          cljs.core.string_print.call(null, string__10304);
          var temp__3974__auto____10306 = cljs.core.next.call(null, G__10302__10305);
          if(temp__3974__auto____10306) {
            var G__10302__10307 = temp__3974__auto____10306;
            var G__10312 = cljs.core.first.call(null, G__10302__10307);
            var G__10313 = G__10302__10307;
            string__10304 = G__10312;
            G__10302__10305 = G__10313;
            continue
          }else {
          }
          break
        }
      }else {
      }
      var temp__3974__auto____10308 = cljs.core.next.call(null, G__10298__10301);
      if(temp__3974__auto____10308) {
        var G__10298__10309 = temp__3974__auto____10308;
        var G__10314 = cljs.core.first.call(null, G__10298__10309);
        var G__10315 = G__10298__10309;
        obj__10300 = G__10314;
        G__10298__10301 = G__10315;
        continue
      }else {
        return null
      }
      break
    }
  }else {
    return null
  }
};
cljs.core.newline = function newline(opts) {
  cljs.core.string_print.call(null, "\n");
  if(cljs.core.truth_(cljs.core._lookup.call(null, opts, "\ufdd0'flush-on-newline", null))) {
    return cljs.core.flush.call(null)
  }else {
    return null
  }
};
cljs.core._STAR_flush_on_newline_STAR_ = true;
cljs.core._STAR_print_readably_STAR_ = true;
cljs.core._STAR_print_meta_STAR_ = false;
cljs.core._STAR_print_dup_STAR_ = false;
cljs.core.pr_opts = function pr_opts() {
  return cljs.core.ObjMap.fromObject(["\ufdd0'flush-on-newline", "\ufdd0'readably", "\ufdd0'meta", "\ufdd0'dup"], {"\ufdd0'flush-on-newline":cljs.core._STAR_flush_on_newline_STAR_, "\ufdd0'readably":cljs.core._STAR_print_readably_STAR_, "\ufdd0'meta":cljs.core._STAR_print_meta_STAR_, "\ufdd0'dup":cljs.core._STAR_print_dup_STAR_})
};
cljs.core.pr_str = function() {
  var pr_str__delegate = function(objs) {
    return cljs.core.pr_str_with_opts.call(null, objs, cljs.core.pr_opts.call(null))
  };
  var pr_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return pr_str__delegate.call(this, objs)
  };
  pr_str.cljs$lang$maxFixedArity = 0;
  pr_str.cljs$lang$applyTo = function(arglist__10316) {
    var objs = cljs.core.seq(arglist__10316);
    return pr_str__delegate(objs)
  };
  pr_str.cljs$lang$arity$variadic = pr_str__delegate;
  return pr_str
}();
cljs.core.prn_str = function() {
  var prn_str__delegate = function(objs) {
    return cljs.core.prn_str_with_opts.call(null, objs, cljs.core.pr_opts.call(null))
  };
  var prn_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return prn_str__delegate.call(this, objs)
  };
  prn_str.cljs$lang$maxFixedArity = 0;
  prn_str.cljs$lang$applyTo = function(arglist__10317) {
    var objs = cljs.core.seq(arglist__10317);
    return prn_str__delegate(objs)
  };
  prn_str.cljs$lang$arity$variadic = prn_str__delegate;
  return prn_str
}();
cljs.core.pr = function() {
  var pr__delegate = function(objs) {
    return cljs.core.pr_with_opts.call(null, objs, cljs.core.pr_opts.call(null))
  };
  var pr = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return pr__delegate.call(this, objs)
  };
  pr.cljs$lang$maxFixedArity = 0;
  pr.cljs$lang$applyTo = function(arglist__10318) {
    var objs = cljs.core.seq(arglist__10318);
    return pr__delegate(objs)
  };
  pr.cljs$lang$arity$variadic = pr__delegate;
  return pr
}();
cljs.core.print = function() {
  var cljs_core_print__delegate = function(objs) {
    return cljs.core.pr_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false))
  };
  var cljs_core_print = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return cljs_core_print__delegate.call(this, objs)
  };
  cljs_core_print.cljs$lang$maxFixedArity = 0;
  cljs_core_print.cljs$lang$applyTo = function(arglist__10319) {
    var objs = cljs.core.seq(arglist__10319);
    return cljs_core_print__delegate(objs)
  };
  cljs_core_print.cljs$lang$arity$variadic = cljs_core_print__delegate;
  return cljs_core_print
}();
cljs.core.print_str = function() {
  var print_str__delegate = function(objs) {
    return cljs.core.pr_str_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false))
  };
  var print_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return print_str__delegate.call(this, objs)
  };
  print_str.cljs$lang$maxFixedArity = 0;
  print_str.cljs$lang$applyTo = function(arglist__10320) {
    var objs = cljs.core.seq(arglist__10320);
    return print_str__delegate(objs)
  };
  print_str.cljs$lang$arity$variadic = print_str__delegate;
  return print_str
}();
cljs.core.println = function() {
  var println__delegate = function(objs) {
    cljs.core.pr_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false));
    return cljs.core.newline.call(null, cljs.core.pr_opts.call(null))
  };
  var println = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return println__delegate.call(this, objs)
  };
  println.cljs$lang$maxFixedArity = 0;
  println.cljs$lang$applyTo = function(arglist__10321) {
    var objs = cljs.core.seq(arglist__10321);
    return println__delegate(objs)
  };
  println.cljs$lang$arity$variadic = println__delegate;
  return println
}();
cljs.core.println_str = function() {
  var println_str__delegate = function(objs) {
    return cljs.core.prn_str_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false))
  };
  var println_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return println_str__delegate.call(this, objs)
  };
  println_str.cljs$lang$maxFixedArity = 0;
  println_str.cljs$lang$applyTo = function(arglist__10322) {
    var objs = cljs.core.seq(arglist__10322);
    return println_str__delegate(objs)
  };
  println_str.cljs$lang$arity$variadic = println_str__delegate;
  return println_str
}();
cljs.core.prn = function() {
  var prn__delegate = function(objs) {
    cljs.core.pr_with_opts.call(null, objs, cljs.core.pr_opts.call(null));
    return cljs.core.newline.call(null, cljs.core.pr_opts.call(null))
  };
  var prn = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return prn__delegate.call(this, objs)
  };
  prn.cljs$lang$maxFixedArity = 0;
  prn.cljs$lang$applyTo = function(arglist__10323) {
    var objs = cljs.core.seq(arglist__10323);
    return prn__delegate(objs)
  };
  prn.cljs$lang$arity$variadic = prn__delegate;
  return prn
}();
cljs.core.printf = function() {
  var printf__delegate = function(fmt, args) {
    return cljs.core.print.call(null, cljs.core.apply.call(null, cljs.core.format, fmt, args))
  };
  var printf = function(fmt, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return printf__delegate.call(this, fmt, args)
  };
  printf.cljs$lang$maxFixedArity = 1;
  printf.cljs$lang$applyTo = function(arglist__10324) {
    var fmt = cljs.core.first(arglist__10324);
    var args = cljs.core.rest(arglist__10324);
    return printf__delegate(fmt, args)
  };
  printf.cljs$lang$arity$variadic = printf__delegate;
  return printf
}();
cljs.core.HashMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.HashMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__10325 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__10325, "{", ", ", "}", opts, coll)
};
cljs.core.IPrintable["number"] = true;
cljs.core._pr_seq["number"] = function(n, opts) {
  return cljs.core.list.call(null, [cljs.core.str(n)].join(""))
};
cljs.core.IndexedSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.Subvec.prototype.cljs$core$IPrintable$ = true;
cljs.core.Subvec.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.ChunkedCons.prototype.cljs$core$IPrintable$ = true;
cljs.core.ChunkedCons.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__10326 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__10326, "{", ", ", "}", opts, coll)
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentArrayMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__10327 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__10327, "{", ", ", "}", opts, coll)
};
cljs.core.PersistentQueue.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "#queue [", " ", "]", opts, cljs.core.seq.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.LazySeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.RSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.RSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "#{", " ", "}", opts, coll)
};
cljs.core.IPrintable["boolean"] = true;
cljs.core._pr_seq["boolean"] = function(bool, opts) {
  return cljs.core.list.call(null, [cljs.core.str(bool)].join(""))
};
cljs.core.IPrintable["string"] = true;
cljs.core._pr_seq["string"] = function(obj, opts) {
  if(cljs.core.keyword_QMARK_.call(null, obj)) {
    return cljs.core.list.call(null, [cljs.core.str(":"), cljs.core.str(function() {
      var temp__3974__auto____10328 = cljs.core.namespace.call(null, obj);
      if(cljs.core.truth_(temp__3974__auto____10328)) {
        var nspc__10329 = temp__3974__auto____10328;
        return[cljs.core.str(nspc__10329), cljs.core.str("/")].join("")
      }else {
        return null
      }
    }()), cljs.core.str(cljs.core.name.call(null, obj))].join(""))
  }else {
    if(cljs.core.symbol_QMARK_.call(null, obj)) {
      return cljs.core.list.call(null, [cljs.core.str(function() {
        var temp__3974__auto____10330 = cljs.core.namespace.call(null, obj);
        if(cljs.core.truth_(temp__3974__auto____10330)) {
          var nspc__10331 = temp__3974__auto____10330;
          return[cljs.core.str(nspc__10331), cljs.core.str("/")].join("")
        }else {
          return null
        }
      }()), cljs.core.str(cljs.core.name.call(null, obj))].join(""))
    }else {
      if("\ufdd0'else") {
        return cljs.core.list.call(null, cljs.core.truth_((new cljs.core.Keyword("\ufdd0'readably")).call(null, opts)) ? goog.string.quote(obj) : obj)
      }else {
        return null
      }
    }
  }
};
cljs.core.NodeSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.NodeSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.RedNode.prototype.cljs$core$IPrintable$ = true;
cljs.core.RedNode.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.ChunkedSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.ChunkedSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__10332 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__10332, "{", ", ", "}", opts, coll)
};
cljs.core.Vector.prototype.cljs$core$IPrintable$ = true;
cljs.core.Vector.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.PersistentHashSet.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentHashSet.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "#{", " ", "}", opts, coll)
};
cljs.core.PersistentVector.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.List.prototype.cljs$core$IPrintable$ = true;
cljs.core.List.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.IPrintable["array"] = true;
cljs.core._pr_seq["array"] = function(a, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "#<Array [", ", ", "]>", opts, a)
};
cljs.core.IPrintable["function"] = true;
cljs.core._pr_seq["function"] = function(this$) {
  return cljs.core.list.call(null, "#<", [cljs.core.str(this$)].join(""), ">")
};
cljs.core.EmptyList.prototype.cljs$core$IPrintable$ = true;
cljs.core.EmptyList.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.list.call(null, "()")
};
cljs.core.BlackNode.prototype.cljs$core$IPrintable$ = true;
cljs.core.BlackNode.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
Date.prototype.cljs$core$IPrintable$ = true;
Date.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(d, _) {
  var normalize__10334 = function(n, len) {
    var ns__10333 = [cljs.core.str(n)].join("");
    while(true) {
      if(cljs.core.count.call(null, ns__10333) < len) {
        var G__10336 = [cljs.core.str("0"), cljs.core.str(ns__10333)].join("");
        ns__10333 = G__10336;
        continue
      }else {
        return ns__10333
      }
      break
    }
  };
  return cljs.core.list.call(null, [cljs.core.str('#inst "'), cljs.core.str(d.getUTCFullYear()), cljs.core.str("-"), cljs.core.str(normalize__10334.call(null, d.getUTCMonth() + 1, 2)), cljs.core.str("-"), cljs.core.str(normalize__10334.call(null, d.getUTCDate(), 2)), cljs.core.str("T"), cljs.core.str(normalize__10334.call(null, d.getUTCHours(), 2)), cljs.core.str(":"), cljs.core.str(normalize__10334.call(null, d.getUTCMinutes(), 2)), cljs.core.str(":"), cljs.core.str(normalize__10334.call(null, d.getUTCSeconds(), 
  2)), cljs.core.str("."), cljs.core.str(normalize__10334.call(null, d.getUTCMilliseconds(), 3)), cljs.core.str("-"), cljs.core.str('00:00"')].join(""))
};
cljs.core.Cons.prototype.cljs$core$IPrintable$ = true;
cljs.core.Cons.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.Range.prototype.cljs$core$IPrintable$ = true;
cljs.core.Range.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.ArrayNodeSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.ObjMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.ObjMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__10335 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__10335, "{", ", ", "}", opts, coll)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.PersistentVector.prototype.cljs$core$IComparable$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IComparable$_compare$arity$2 = function(x, y) {
  return cljs.core.compare_indexed.call(null, x, y)
};
cljs.core.Atom = function(state, meta, validator, watches) {
  this.state = state;
  this.meta = meta;
  this.validator = validator;
  this.watches = watches;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 2690809856
};
cljs.core.Atom.cljs$lang$type = true;
cljs.core.Atom.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/Atom")
};
cljs.core.Atom.prototype.cljs$core$IHash$_hash$arity$1 = function(this$) {
  var this__10337 = this;
  return goog.getUid(this$)
};
cljs.core.Atom.prototype.cljs$core$IWatchable$_notify_watches$arity$3 = function(this$, oldval, newval) {
  var this__10338 = this;
  var G__10339__10340 = cljs.core.seq.call(null, this__10338.watches);
  if(G__10339__10340) {
    var G__10342__10344 = cljs.core.first.call(null, G__10339__10340);
    var vec__10343__10345 = G__10342__10344;
    var key__10346 = cljs.core.nth.call(null, vec__10343__10345, 0, null);
    var f__10347 = cljs.core.nth.call(null, vec__10343__10345, 1, null);
    var G__10339__10348 = G__10339__10340;
    var G__10342__10349 = G__10342__10344;
    var G__10339__10350 = G__10339__10348;
    while(true) {
      var vec__10351__10352 = G__10342__10349;
      var key__10353 = cljs.core.nth.call(null, vec__10351__10352, 0, null);
      var f__10354 = cljs.core.nth.call(null, vec__10351__10352, 1, null);
      var G__10339__10355 = G__10339__10350;
      f__10354.call(null, key__10353, this$, oldval, newval);
      var temp__3974__auto____10356 = cljs.core.next.call(null, G__10339__10355);
      if(temp__3974__auto____10356) {
        var G__10339__10357 = temp__3974__auto____10356;
        var G__10364 = cljs.core.first.call(null, G__10339__10357);
        var G__10365 = G__10339__10357;
        G__10342__10349 = G__10364;
        G__10339__10350 = G__10365;
        continue
      }else {
        return null
      }
      break
    }
  }else {
    return null
  }
};
cljs.core.Atom.prototype.cljs$core$IWatchable$_add_watch$arity$3 = function(this$, key, f) {
  var this__10358 = this;
  return this$.watches = cljs.core.assoc.call(null, this__10358.watches, key, f)
};
cljs.core.Atom.prototype.cljs$core$IWatchable$_remove_watch$arity$2 = function(this$, key) {
  var this__10359 = this;
  return this$.watches = cljs.core.dissoc.call(null, this__10359.watches, key)
};
cljs.core.Atom.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(a, opts) {
  var this__10360 = this;
  return cljs.core.concat.call(null, cljs.core.PersistentVector.fromArray(["#<Atom: "], true), cljs.core._pr_seq.call(null, this__10360.state, opts), ">")
};
cljs.core.Atom.prototype.cljs$core$IMeta$_meta$arity$1 = function(_) {
  var this__10361 = this;
  return this__10361.meta
};
cljs.core.Atom.prototype.cljs$core$IDeref$_deref$arity$1 = function(_) {
  var this__10362 = this;
  return this__10362.state
};
cljs.core.Atom.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(o, other) {
  var this__10363 = this;
  return o === other
};
cljs.core.Atom;
cljs.core.atom = function() {
  var atom = null;
  var atom__1 = function(x) {
    return new cljs.core.Atom(x, null, null, null)
  };
  var atom__2 = function() {
    var G__10377__delegate = function(x, p__10366) {
      var map__10372__10373 = p__10366;
      var map__10372__10374 = cljs.core.seq_QMARK_.call(null, map__10372__10373) ? cljs.core.apply.call(null, cljs.core.hash_map, map__10372__10373) : map__10372__10373;
      var validator__10375 = cljs.core._lookup.call(null, map__10372__10374, "\ufdd0'validator", null);
      var meta__10376 = cljs.core._lookup.call(null, map__10372__10374, "\ufdd0'meta", null);
      return new cljs.core.Atom(x, meta__10376, validator__10375, null)
    };
    var G__10377 = function(x, var_args) {
      var p__10366 = null;
      if(goog.isDef(var_args)) {
        p__10366 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__10377__delegate.call(this, x, p__10366)
    };
    G__10377.cljs$lang$maxFixedArity = 1;
    G__10377.cljs$lang$applyTo = function(arglist__10378) {
      var x = cljs.core.first(arglist__10378);
      var p__10366 = cljs.core.rest(arglist__10378);
      return G__10377__delegate(x, p__10366)
    };
    G__10377.cljs$lang$arity$variadic = G__10377__delegate;
    return G__10377
  }();
  atom = function(x, var_args) {
    var p__10366 = var_args;
    switch(arguments.length) {
      case 1:
        return atom__1.call(this, x);
      default:
        return atom__2.cljs$lang$arity$variadic(x, cljs.core.array_seq(arguments, 1))
    }
    throw"Invalid arity: " + arguments.length;
  };
  atom.cljs$lang$maxFixedArity = 1;
  atom.cljs$lang$applyTo = atom__2.cljs$lang$applyTo;
  atom.cljs$lang$arity$1 = atom__1;
  atom.cljs$lang$arity$variadic = atom__2.cljs$lang$arity$variadic;
  return atom
}();
cljs.core.reset_BANG_ = function reset_BANG_(a, new_value) {
  var temp__3974__auto____10382 = a.validator;
  if(cljs.core.truth_(temp__3974__auto____10382)) {
    var validate__10383 = temp__3974__auto____10382;
    if(cljs.core.truth_(validate__10383.call(null, new_value))) {
    }else {
      throw new Error([cljs.core.str("Assert failed: "), cljs.core.str("Validator rejected reference state"), cljs.core.str("\n"), cljs.core.str(cljs.core.pr_str.call(null, cljs.core.with_meta(cljs.core.list("\ufdd1'validate", "\ufdd1'new-value"), cljs.core.hash_map("\ufdd0'line", 6440))))].join(""));
    }
  }else {
  }
  var old_value__10384 = a.state;
  a.state = new_value;
  cljs.core._notify_watches.call(null, a, old_value__10384, new_value);
  return new_value
};
cljs.core.swap_BANG_ = function() {
  var swap_BANG_ = null;
  var swap_BANG___2 = function(a, f) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state))
  };
  var swap_BANG___3 = function(a, f, x) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x))
  };
  var swap_BANG___4 = function(a, f, x, y) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x, y))
  };
  var swap_BANG___5 = function(a, f, x, y, z) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x, y, z))
  };
  var swap_BANG___6 = function() {
    var G__10385__delegate = function(a, f, x, y, z, more) {
      return cljs.core.reset_BANG_.call(null, a, cljs.core.apply.call(null, f, a.state, x, y, z, more))
    };
    var G__10385 = function(a, f, x, y, z, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 5), 0)
      }
      return G__10385__delegate.call(this, a, f, x, y, z, more)
    };
    G__10385.cljs$lang$maxFixedArity = 5;
    G__10385.cljs$lang$applyTo = function(arglist__10386) {
      var a = cljs.core.first(arglist__10386);
      var f = cljs.core.first(cljs.core.next(arglist__10386));
      var x = cljs.core.first(cljs.core.next(cljs.core.next(arglist__10386)));
      var y = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__10386))));
      var z = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__10386)))));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__10386)))));
      return G__10385__delegate(a, f, x, y, z, more)
    };
    G__10385.cljs$lang$arity$variadic = G__10385__delegate;
    return G__10385
  }();
  swap_BANG_ = function(a, f, x, y, z, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return swap_BANG___2.call(this, a, f);
      case 3:
        return swap_BANG___3.call(this, a, f, x);
      case 4:
        return swap_BANG___4.call(this, a, f, x, y);
      case 5:
        return swap_BANG___5.call(this, a, f, x, y, z);
      default:
        return swap_BANG___6.cljs$lang$arity$variadic(a, f, x, y, z, cljs.core.array_seq(arguments, 5))
    }
    throw"Invalid arity: " + arguments.length;
  };
  swap_BANG_.cljs$lang$maxFixedArity = 5;
  swap_BANG_.cljs$lang$applyTo = swap_BANG___6.cljs$lang$applyTo;
  swap_BANG_.cljs$lang$arity$2 = swap_BANG___2;
  swap_BANG_.cljs$lang$arity$3 = swap_BANG___3;
  swap_BANG_.cljs$lang$arity$4 = swap_BANG___4;
  swap_BANG_.cljs$lang$arity$5 = swap_BANG___5;
  swap_BANG_.cljs$lang$arity$variadic = swap_BANG___6.cljs$lang$arity$variadic;
  return swap_BANG_
}();
cljs.core.compare_and_set_BANG_ = function compare_and_set_BANG_(a, oldval, newval) {
  if(cljs.core._EQ_.call(null, a.state, oldval)) {
    cljs.core.reset_BANG_.call(null, a, newval);
    return true
  }else {
    return false
  }
};
cljs.core.deref = function deref(o) {
  return cljs.core._deref.call(null, o)
};
cljs.core.set_validator_BANG_ = function set_validator_BANG_(iref, val) {
  return iref.validator = val
};
cljs.core.get_validator = function get_validator(iref) {
  return iref.validator
};
cljs.core.alter_meta_BANG_ = function() {
  var alter_meta_BANG___delegate = function(iref, f, args) {
    return iref.meta = cljs.core.apply.call(null, f, iref.meta, args)
  };
  var alter_meta_BANG_ = function(iref, f, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return alter_meta_BANG___delegate.call(this, iref, f, args)
  };
  alter_meta_BANG_.cljs$lang$maxFixedArity = 2;
  alter_meta_BANG_.cljs$lang$applyTo = function(arglist__10387) {
    var iref = cljs.core.first(arglist__10387);
    var f = cljs.core.first(cljs.core.next(arglist__10387));
    var args = cljs.core.rest(cljs.core.next(arglist__10387));
    return alter_meta_BANG___delegate(iref, f, args)
  };
  alter_meta_BANG_.cljs$lang$arity$variadic = alter_meta_BANG___delegate;
  return alter_meta_BANG_
}();
cljs.core.reset_meta_BANG_ = function reset_meta_BANG_(iref, m) {
  return iref.meta = m
};
cljs.core.add_watch = function add_watch(iref, key, f) {
  return cljs.core._add_watch.call(null, iref, key, f)
};
cljs.core.remove_watch = function remove_watch(iref, key) {
  return cljs.core._remove_watch.call(null, iref, key)
};
cljs.core.gensym_counter = null;
cljs.core.gensym = function() {
  var gensym = null;
  var gensym__0 = function() {
    return gensym.call(null, "G__")
  };
  var gensym__1 = function(prefix_string) {
    if(cljs.core.gensym_counter == null) {
      cljs.core.gensym_counter = cljs.core.atom.call(null, 0)
    }else {
    }
    return cljs.core.symbol.call(null, [cljs.core.str(prefix_string), cljs.core.str(cljs.core.swap_BANG_.call(null, cljs.core.gensym_counter, cljs.core.inc))].join(""))
  };
  gensym = function(prefix_string) {
    switch(arguments.length) {
      case 0:
        return gensym__0.call(this);
      case 1:
        return gensym__1.call(this, prefix_string)
    }
    throw"Invalid arity: " + arguments.length;
  };
  gensym.cljs$lang$arity$0 = gensym__0;
  gensym.cljs$lang$arity$1 = gensym__1;
  return gensym
}();
cljs.core.fixture1 = 1;
cljs.core.fixture2 = 2;
cljs.core.Delay = function(state, f) {
  this.state = state;
  this.f = f;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 1073774592
};
cljs.core.Delay.cljs$lang$type = true;
cljs.core.Delay.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/Delay")
};
cljs.core.Delay.prototype.cljs$core$IPending$_realized_QMARK_$arity$1 = function(d) {
  var this__10388 = this;
  return(new cljs.core.Keyword("\ufdd0'done")).call(null, cljs.core.deref.call(null, this__10388.state))
};
cljs.core.Delay.prototype.cljs$core$IDeref$_deref$arity$1 = function(_) {
  var this__10389 = this;
  return(new cljs.core.Keyword("\ufdd0'value")).call(null, cljs.core.swap_BANG_.call(null, this__10389.state, function(p__10390) {
    var map__10391__10392 = p__10390;
    var map__10391__10393 = cljs.core.seq_QMARK_.call(null, map__10391__10392) ? cljs.core.apply.call(null, cljs.core.hash_map, map__10391__10392) : map__10391__10392;
    var curr_state__10394 = map__10391__10393;
    var done__10395 = cljs.core._lookup.call(null, map__10391__10393, "\ufdd0'done", null);
    if(cljs.core.truth_(done__10395)) {
      return curr_state__10394
    }else {
      return cljs.core.ObjMap.fromObject(["\ufdd0'done", "\ufdd0'value"], {"\ufdd0'done":true, "\ufdd0'value":this__10389.f.call(null)})
    }
  }))
};
cljs.core.Delay;
cljs.core.delay_QMARK_ = function delay_QMARK_(x) {
  return cljs.core.instance_QMARK_.call(null, cljs.core.Delay, x)
};
cljs.core.force = function force(x) {
  if(cljs.core.delay_QMARK_.call(null, x)) {
    return cljs.core.deref.call(null, x)
  }else {
    return x
  }
};
cljs.core.realized_QMARK_ = function realized_QMARK_(d) {
  return cljs.core._realized_QMARK_.call(null, d)
};
cljs.core.js__GT_clj = function() {
  var js__GT_clj__delegate = function(x, options) {
    var map__10416__10417 = options;
    var map__10416__10418 = cljs.core.seq_QMARK_.call(null, map__10416__10417) ? cljs.core.apply.call(null, cljs.core.hash_map, map__10416__10417) : map__10416__10417;
    var keywordize_keys__10419 = cljs.core._lookup.call(null, map__10416__10418, "\ufdd0'keywordize-keys", null);
    var keyfn__10420 = cljs.core.truth_(keywordize_keys__10419) ? cljs.core.keyword : cljs.core.str;
    var f__10435 = function thisfn(x) {
      if(cljs.core.seq_QMARK_.call(null, x)) {
        return cljs.core.doall.call(null, cljs.core.map.call(null, thisfn, x))
      }else {
        if(cljs.core.coll_QMARK_.call(null, x)) {
          return cljs.core.into.call(null, cljs.core.empty.call(null, x), cljs.core.map.call(null, thisfn, x))
        }else {
          if(cljs.core.truth_(goog.isArray(x))) {
            return cljs.core.vec.call(null, cljs.core.map.call(null, thisfn, x))
          }else {
            if(cljs.core.type.call(null, x) === Object) {
              return cljs.core.into.call(null, cljs.core.ObjMap.EMPTY, function() {
                var iter__2458__auto____10434 = function iter__10428(s__10429) {
                  return new cljs.core.LazySeq(null, false, function() {
                    var s__10429__10432 = s__10429;
                    while(true) {
                      if(cljs.core.seq.call(null, s__10429__10432)) {
                        var k__10433 = cljs.core.first.call(null, s__10429__10432);
                        return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([keyfn__10420.call(null, k__10433), thisfn.call(null, x[k__10433])], true), iter__10428.call(null, cljs.core.rest.call(null, s__10429__10432)))
                      }else {
                        return null
                      }
                      break
                    }
                  }, null)
                };
                return iter__2458__auto____10434.call(null, cljs.core.js_keys.call(null, x))
              }())
            }else {
              if("\ufdd0'else") {
                return x
              }else {
                return null
              }
            }
          }
        }
      }
    };
    return f__10435.call(null, x)
  };
  var js__GT_clj = function(x, var_args) {
    var options = null;
    if(goog.isDef(var_args)) {
      options = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return js__GT_clj__delegate.call(this, x, options)
  };
  js__GT_clj.cljs$lang$maxFixedArity = 1;
  js__GT_clj.cljs$lang$applyTo = function(arglist__10436) {
    var x = cljs.core.first(arglist__10436);
    var options = cljs.core.rest(arglist__10436);
    return js__GT_clj__delegate(x, options)
  };
  js__GT_clj.cljs$lang$arity$variadic = js__GT_clj__delegate;
  return js__GT_clj
}();
cljs.core.memoize = function memoize(f) {
  var mem__10441 = cljs.core.atom.call(null, cljs.core.ObjMap.EMPTY);
  return function() {
    var G__10445__delegate = function(args) {
      var temp__3971__auto____10442 = cljs.core._lookup.call(null, cljs.core.deref.call(null, mem__10441), args, null);
      if(cljs.core.truth_(temp__3971__auto____10442)) {
        var v__10443 = temp__3971__auto____10442;
        return v__10443
      }else {
        var ret__10444 = cljs.core.apply.call(null, f, args);
        cljs.core.swap_BANG_.call(null, mem__10441, cljs.core.assoc, args, ret__10444);
        return ret__10444
      }
    };
    var G__10445 = function(var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
      }
      return G__10445__delegate.call(this, args)
    };
    G__10445.cljs$lang$maxFixedArity = 0;
    G__10445.cljs$lang$applyTo = function(arglist__10446) {
      var args = cljs.core.seq(arglist__10446);
      return G__10445__delegate(args)
    };
    G__10445.cljs$lang$arity$variadic = G__10445__delegate;
    return G__10445
  }()
};
cljs.core.trampoline = function() {
  var trampoline = null;
  var trampoline__1 = function(f) {
    while(true) {
      var ret__10448 = f.call(null);
      if(cljs.core.fn_QMARK_.call(null, ret__10448)) {
        var G__10449 = ret__10448;
        f = G__10449;
        continue
      }else {
        return ret__10448
      }
      break
    }
  };
  var trampoline__2 = function() {
    var G__10450__delegate = function(f, args) {
      return trampoline.call(null, function() {
        return cljs.core.apply.call(null, f, args)
      })
    };
    var G__10450 = function(f, var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__10450__delegate.call(this, f, args)
    };
    G__10450.cljs$lang$maxFixedArity = 1;
    G__10450.cljs$lang$applyTo = function(arglist__10451) {
      var f = cljs.core.first(arglist__10451);
      var args = cljs.core.rest(arglist__10451);
      return G__10450__delegate(f, args)
    };
    G__10450.cljs$lang$arity$variadic = G__10450__delegate;
    return G__10450
  }();
  trampoline = function(f, var_args) {
    var args = var_args;
    switch(arguments.length) {
      case 1:
        return trampoline__1.call(this, f);
      default:
        return trampoline__2.cljs$lang$arity$variadic(f, cljs.core.array_seq(arguments, 1))
    }
    throw"Invalid arity: " + arguments.length;
  };
  trampoline.cljs$lang$maxFixedArity = 1;
  trampoline.cljs$lang$applyTo = trampoline__2.cljs$lang$applyTo;
  trampoline.cljs$lang$arity$1 = trampoline__1;
  trampoline.cljs$lang$arity$variadic = trampoline__2.cljs$lang$arity$variadic;
  return trampoline
}();
cljs.core.rand = function() {
  var rand = null;
  var rand__0 = function() {
    return rand.call(null, 1)
  };
  var rand__1 = function(n) {
    return Math.random.call(null) * n
  };
  rand = function(n) {
    switch(arguments.length) {
      case 0:
        return rand__0.call(this);
      case 1:
        return rand__1.call(this, n)
    }
    throw"Invalid arity: " + arguments.length;
  };
  rand.cljs$lang$arity$0 = rand__0;
  rand.cljs$lang$arity$1 = rand__1;
  return rand
}();
cljs.core.rand_int = function rand_int(n) {
  return Math.floor.call(null, Math.random.call(null) * n)
};
cljs.core.rand_nth = function rand_nth(coll) {
  return cljs.core.nth.call(null, coll, cljs.core.rand_int.call(null, cljs.core.count.call(null, coll)))
};
cljs.core.group_by = function group_by(f, coll) {
  return cljs.core.reduce.call(null, function(ret, x) {
    var k__10453 = f.call(null, x);
    return cljs.core.assoc.call(null, ret, k__10453, cljs.core.conj.call(null, cljs.core._lookup.call(null, ret, k__10453, cljs.core.PersistentVector.EMPTY), x))
  }, cljs.core.ObjMap.EMPTY, coll)
};
cljs.core.make_hierarchy = function make_hierarchy() {
  return cljs.core.ObjMap.fromObject(["\ufdd0'parents", "\ufdd0'descendants", "\ufdd0'ancestors"], {"\ufdd0'parents":cljs.core.ObjMap.EMPTY, "\ufdd0'descendants":cljs.core.ObjMap.EMPTY, "\ufdd0'ancestors":cljs.core.ObjMap.EMPTY})
};
cljs.core.global_hierarchy = cljs.core.atom.call(null, cljs.core.make_hierarchy.call(null));
cljs.core.isa_QMARK_ = function() {
  var isa_QMARK_ = null;
  var isa_QMARK___2 = function(child, parent) {
    return isa_QMARK_.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), child, parent)
  };
  var isa_QMARK___3 = function(h, child, parent) {
    var or__3824__auto____10462 = cljs.core._EQ_.call(null, child, parent);
    if(or__3824__auto____10462) {
      return or__3824__auto____10462
    }else {
      var or__3824__auto____10463 = cljs.core.contains_QMARK_.call(null, (new cljs.core.Keyword("\ufdd0'ancestors")).call(null, h).call(null, child), parent);
      if(or__3824__auto____10463) {
        return or__3824__auto____10463
      }else {
        var and__3822__auto____10464 = cljs.core.vector_QMARK_.call(null, parent);
        if(and__3822__auto____10464) {
          var and__3822__auto____10465 = cljs.core.vector_QMARK_.call(null, child);
          if(and__3822__auto____10465) {
            var and__3822__auto____10466 = cljs.core.count.call(null, parent) === cljs.core.count.call(null, child);
            if(and__3822__auto____10466) {
              var ret__10467 = true;
              var i__10468 = 0;
              while(true) {
                if(function() {
                  var or__3824__auto____10469 = cljs.core.not.call(null, ret__10467);
                  if(or__3824__auto____10469) {
                    return or__3824__auto____10469
                  }else {
                    return i__10468 === cljs.core.count.call(null, parent)
                  }
                }()) {
                  return ret__10467
                }else {
                  var G__10470 = isa_QMARK_.call(null, h, child.call(null, i__10468), parent.call(null, i__10468));
                  var G__10471 = i__10468 + 1;
                  ret__10467 = G__10470;
                  i__10468 = G__10471;
                  continue
                }
                break
              }
            }else {
              return and__3822__auto____10466
            }
          }else {
            return and__3822__auto____10465
          }
        }else {
          return and__3822__auto____10464
        }
      }
    }
  };
  isa_QMARK_ = function(h, child, parent) {
    switch(arguments.length) {
      case 2:
        return isa_QMARK___2.call(this, h, child);
      case 3:
        return isa_QMARK___3.call(this, h, child, parent)
    }
    throw"Invalid arity: " + arguments.length;
  };
  isa_QMARK_.cljs$lang$arity$2 = isa_QMARK___2;
  isa_QMARK_.cljs$lang$arity$3 = isa_QMARK___3;
  return isa_QMARK_
}();
cljs.core.parents = function() {
  var parents = null;
  var parents__1 = function(tag) {
    return parents.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), tag)
  };
  var parents__2 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core._lookup.call(null, (new cljs.core.Keyword("\ufdd0'parents")).call(null, h), tag, null))
  };
  parents = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return parents__1.call(this, h);
      case 2:
        return parents__2.call(this, h, tag)
    }
    throw"Invalid arity: " + arguments.length;
  };
  parents.cljs$lang$arity$1 = parents__1;
  parents.cljs$lang$arity$2 = parents__2;
  return parents
}();
cljs.core.ancestors = function() {
  var ancestors = null;
  var ancestors__1 = function(tag) {
    return ancestors.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), tag)
  };
  var ancestors__2 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core._lookup.call(null, (new cljs.core.Keyword("\ufdd0'ancestors")).call(null, h), tag, null))
  };
  ancestors = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return ancestors__1.call(this, h);
      case 2:
        return ancestors__2.call(this, h, tag)
    }
    throw"Invalid arity: " + arguments.length;
  };
  ancestors.cljs$lang$arity$1 = ancestors__1;
  ancestors.cljs$lang$arity$2 = ancestors__2;
  return ancestors
}();
cljs.core.descendants = function() {
  var descendants = null;
  var descendants__1 = function(tag) {
    return descendants.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), tag)
  };
  var descendants__2 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core._lookup.call(null, (new cljs.core.Keyword("\ufdd0'descendants")).call(null, h), tag, null))
  };
  descendants = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return descendants__1.call(this, h);
      case 2:
        return descendants__2.call(this, h, tag)
    }
    throw"Invalid arity: " + arguments.length;
  };
  descendants.cljs$lang$arity$1 = descendants__1;
  descendants.cljs$lang$arity$2 = descendants__2;
  return descendants
}();
cljs.core.derive = function() {
  var derive = null;
  var derive__2 = function(tag, parent) {
    if(cljs.core.truth_(cljs.core.namespace.call(null, parent))) {
    }else {
      throw new Error([cljs.core.str("Assert failed: "), cljs.core.str(cljs.core.pr_str.call(null, cljs.core.with_meta(cljs.core.list("\ufdd1'namespace", "\ufdd1'parent"), cljs.core.hash_map("\ufdd0'line", 6724))))].join(""));
    }
    cljs.core.swap_BANG_.call(null, cljs.core.global_hierarchy, derive, tag, parent);
    return null
  };
  var derive__3 = function(h, tag, parent) {
    if(cljs.core.not_EQ_.call(null, tag, parent)) {
    }else {
      throw new Error([cljs.core.str("Assert failed: "), cljs.core.str(cljs.core.pr_str.call(null, cljs.core.with_meta(cljs.core.list("\ufdd1'not=", "\ufdd1'tag", "\ufdd1'parent"), cljs.core.hash_map("\ufdd0'line", 6728))))].join(""));
    }
    var tp__10480 = (new cljs.core.Keyword("\ufdd0'parents")).call(null, h);
    var td__10481 = (new cljs.core.Keyword("\ufdd0'descendants")).call(null, h);
    var ta__10482 = (new cljs.core.Keyword("\ufdd0'ancestors")).call(null, h);
    var tf__10483 = function(m, source, sources, target, targets) {
      return cljs.core.reduce.call(null, function(ret, k) {
        return cljs.core.assoc.call(null, ret, k, cljs.core.reduce.call(null, cljs.core.conj, cljs.core._lookup.call(null, targets, k, cljs.core.PersistentHashSet.EMPTY), cljs.core.cons.call(null, target, targets.call(null, target))))
      }, m, cljs.core.cons.call(null, source, sources.call(null, source)))
    };
    var or__3824__auto____10484 = cljs.core.contains_QMARK_.call(null, tp__10480.call(null, tag), parent) ? null : function() {
      if(cljs.core.contains_QMARK_.call(null, ta__10482.call(null, tag), parent)) {
        throw new Error([cljs.core.str(tag), cljs.core.str("already has"), cljs.core.str(parent), cljs.core.str("as ancestor")].join(""));
      }else {
      }
      if(cljs.core.contains_QMARK_.call(null, ta__10482.call(null, parent), tag)) {
        throw new Error([cljs.core.str("Cyclic derivation:"), cljs.core.str(parent), cljs.core.str("has"), cljs.core.str(tag), cljs.core.str("as ancestor")].join(""));
      }else {
      }
      return cljs.core.ObjMap.fromObject(["\ufdd0'parents", "\ufdd0'ancestors", "\ufdd0'descendants"], {"\ufdd0'parents":cljs.core.assoc.call(null, (new cljs.core.Keyword("\ufdd0'parents")).call(null, h), tag, cljs.core.conj.call(null, cljs.core._lookup.call(null, tp__10480, tag, cljs.core.PersistentHashSet.EMPTY), parent)), "\ufdd0'ancestors":tf__10483.call(null, (new cljs.core.Keyword("\ufdd0'ancestors")).call(null, h), tag, td__10481, parent, ta__10482), "\ufdd0'descendants":tf__10483.call(null, 
      (new cljs.core.Keyword("\ufdd0'descendants")).call(null, h), parent, ta__10482, tag, td__10481)})
    }();
    if(cljs.core.truth_(or__3824__auto____10484)) {
      return or__3824__auto____10484
    }else {
      return h
    }
  };
  derive = function(h, tag, parent) {
    switch(arguments.length) {
      case 2:
        return derive__2.call(this, h, tag);
      case 3:
        return derive__3.call(this, h, tag, parent)
    }
    throw"Invalid arity: " + arguments.length;
  };
  derive.cljs$lang$arity$2 = derive__2;
  derive.cljs$lang$arity$3 = derive__3;
  return derive
}();
cljs.core.underive = function() {
  var underive = null;
  var underive__2 = function(tag, parent) {
    cljs.core.swap_BANG_.call(null, cljs.core.global_hierarchy, underive, tag, parent);
    return null
  };
  var underive__3 = function(h, tag, parent) {
    var parentMap__10489 = (new cljs.core.Keyword("\ufdd0'parents")).call(null, h);
    var childsParents__10490 = cljs.core.truth_(parentMap__10489.call(null, tag)) ? cljs.core.disj.call(null, parentMap__10489.call(null, tag), parent) : cljs.core.PersistentHashSet.EMPTY;
    var newParents__10491 = cljs.core.truth_(cljs.core.not_empty.call(null, childsParents__10490)) ? cljs.core.assoc.call(null, parentMap__10489, tag, childsParents__10490) : cljs.core.dissoc.call(null, parentMap__10489, tag);
    var deriv_seq__10492 = cljs.core.flatten.call(null, cljs.core.map.call(null, function(p1__10472_SHARP_) {
      return cljs.core.cons.call(null, cljs.core.first.call(null, p1__10472_SHARP_), cljs.core.interpose.call(null, cljs.core.first.call(null, p1__10472_SHARP_), cljs.core.second.call(null, p1__10472_SHARP_)))
    }, cljs.core.seq.call(null, newParents__10491)));
    if(cljs.core.contains_QMARK_.call(null, parentMap__10489.call(null, tag), parent)) {
      return cljs.core.reduce.call(null, function(p1__10473_SHARP_, p2__10474_SHARP_) {
        return cljs.core.apply.call(null, cljs.core.derive, p1__10473_SHARP_, p2__10474_SHARP_)
      }, cljs.core.make_hierarchy.call(null), cljs.core.partition.call(null, 2, deriv_seq__10492))
    }else {
      return h
    }
  };
  underive = function(h, tag, parent) {
    switch(arguments.length) {
      case 2:
        return underive__2.call(this, h, tag);
      case 3:
        return underive__3.call(this, h, tag, parent)
    }
    throw"Invalid arity: " + arguments.length;
  };
  underive.cljs$lang$arity$2 = underive__2;
  underive.cljs$lang$arity$3 = underive__3;
  return underive
}();
cljs.core.reset_cache = function reset_cache(method_cache, method_table, cached_hierarchy, hierarchy) {
  cljs.core.swap_BANG_.call(null, method_cache, function(_) {
    return cljs.core.deref.call(null, method_table)
  });
  return cljs.core.swap_BANG_.call(null, cached_hierarchy, function(_) {
    return cljs.core.deref.call(null, hierarchy)
  })
};
cljs.core.prefers_STAR_ = function prefers_STAR_(x, y, prefer_table) {
  var xprefs__10500 = cljs.core.deref.call(null, prefer_table).call(null, x);
  var or__3824__auto____10502 = cljs.core.truth_(function() {
    var and__3822__auto____10501 = xprefs__10500;
    if(cljs.core.truth_(and__3822__auto____10501)) {
      return xprefs__10500.call(null, y)
    }else {
      return and__3822__auto____10501
    }
  }()) ? true : null;
  if(cljs.core.truth_(or__3824__auto____10502)) {
    return or__3824__auto____10502
  }else {
    var or__3824__auto____10504 = function() {
      var ps__10503 = cljs.core.parents.call(null, y);
      while(true) {
        if(cljs.core.count.call(null, ps__10503) > 0) {
          if(cljs.core.truth_(prefers_STAR_.call(null, x, cljs.core.first.call(null, ps__10503), prefer_table))) {
          }else {
          }
          var G__10507 = cljs.core.rest.call(null, ps__10503);
          ps__10503 = G__10507;
          continue
        }else {
          return null
        }
        break
      }
    }();
    if(cljs.core.truth_(or__3824__auto____10504)) {
      return or__3824__auto____10504
    }else {
      var or__3824__auto____10506 = function() {
        var ps__10505 = cljs.core.parents.call(null, x);
        while(true) {
          if(cljs.core.count.call(null, ps__10505) > 0) {
            if(cljs.core.truth_(prefers_STAR_.call(null, cljs.core.first.call(null, ps__10505), y, prefer_table))) {
            }else {
            }
            var G__10508 = cljs.core.rest.call(null, ps__10505);
            ps__10505 = G__10508;
            continue
          }else {
            return null
          }
          break
        }
      }();
      if(cljs.core.truth_(or__3824__auto____10506)) {
        return or__3824__auto____10506
      }else {
        return false
      }
    }
  }
};
cljs.core.dominates = function dominates(x, y, prefer_table) {
  var or__3824__auto____10510 = cljs.core.prefers_STAR_.call(null, x, y, prefer_table);
  if(cljs.core.truth_(or__3824__auto____10510)) {
    return or__3824__auto____10510
  }else {
    return cljs.core.isa_QMARK_.call(null, x, y)
  }
};
cljs.core.find_and_cache_best_method = function find_and_cache_best_method(name, dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy) {
  var best_entry__10528 = cljs.core.reduce.call(null, function(be, p__10520) {
    var vec__10521__10522 = p__10520;
    var k__10523 = cljs.core.nth.call(null, vec__10521__10522, 0, null);
    var ___10524 = cljs.core.nth.call(null, vec__10521__10522, 1, null);
    var e__10525 = vec__10521__10522;
    if(cljs.core.isa_QMARK_.call(null, dispatch_val, k__10523)) {
      var be2__10527 = cljs.core.truth_(function() {
        var or__3824__auto____10526 = be == null;
        if(or__3824__auto____10526) {
          return or__3824__auto____10526
        }else {
          return cljs.core.dominates.call(null, k__10523, cljs.core.first.call(null, be), prefer_table)
        }
      }()) ? e__10525 : be;
      if(cljs.core.truth_(cljs.core.dominates.call(null, cljs.core.first.call(null, be2__10527), k__10523, prefer_table))) {
      }else {
        throw new Error([cljs.core.str("Multiple methods in multimethod '"), cljs.core.str(name), cljs.core.str("' match dispatch value: "), cljs.core.str(dispatch_val), cljs.core.str(" -> "), cljs.core.str(k__10523), cljs.core.str(" and "), cljs.core.str(cljs.core.first.call(null, be2__10527)), cljs.core.str(", and neither is preferred")].join(""));
      }
      return be2__10527
    }else {
      return be
    }
  }, null, cljs.core.deref.call(null, method_table));
  if(cljs.core.truth_(best_entry__10528)) {
    if(cljs.core._EQ_.call(null, cljs.core.deref.call(null, cached_hierarchy), cljs.core.deref.call(null, hierarchy))) {
      cljs.core.swap_BANG_.call(null, method_cache, cljs.core.assoc, dispatch_val, cljs.core.second.call(null, best_entry__10528));
      return cljs.core.second.call(null, best_entry__10528)
    }else {
      cljs.core.reset_cache.call(null, method_cache, method_table, cached_hierarchy, hierarchy);
      return find_and_cache_best_method.call(null, name, dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy)
    }
  }else {
    return null
  }
};
cljs.core.IMultiFn = {};
cljs.core._reset = function _reset(mf) {
  if(function() {
    var and__3822__auto____10533 = mf;
    if(and__3822__auto____10533) {
      return mf.cljs$core$IMultiFn$_reset$arity$1
    }else {
      return and__3822__auto____10533
    }
  }()) {
    return mf.cljs$core$IMultiFn$_reset$arity$1(mf)
  }else {
    var x__2359__auto____10534 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10535 = cljs.core._reset[goog.typeOf(x__2359__auto____10534)];
      if(or__3824__auto____10535) {
        return or__3824__auto____10535
      }else {
        var or__3824__auto____10536 = cljs.core._reset["_"];
        if(or__3824__auto____10536) {
          return or__3824__auto____10536
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-reset", mf);
        }
      }
    }().call(null, mf)
  }
};
cljs.core._add_method = function _add_method(mf, dispatch_val, method) {
  if(function() {
    var and__3822__auto____10541 = mf;
    if(and__3822__auto____10541) {
      return mf.cljs$core$IMultiFn$_add_method$arity$3
    }else {
      return and__3822__auto____10541
    }
  }()) {
    return mf.cljs$core$IMultiFn$_add_method$arity$3(mf, dispatch_val, method)
  }else {
    var x__2359__auto____10542 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10543 = cljs.core._add_method[goog.typeOf(x__2359__auto____10542)];
      if(or__3824__auto____10543) {
        return or__3824__auto____10543
      }else {
        var or__3824__auto____10544 = cljs.core._add_method["_"];
        if(or__3824__auto____10544) {
          return or__3824__auto____10544
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-add-method", mf);
        }
      }
    }().call(null, mf, dispatch_val, method)
  }
};
cljs.core._remove_method = function _remove_method(mf, dispatch_val) {
  if(function() {
    var and__3822__auto____10549 = mf;
    if(and__3822__auto____10549) {
      return mf.cljs$core$IMultiFn$_remove_method$arity$2
    }else {
      return and__3822__auto____10549
    }
  }()) {
    return mf.cljs$core$IMultiFn$_remove_method$arity$2(mf, dispatch_val)
  }else {
    var x__2359__auto____10550 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10551 = cljs.core._remove_method[goog.typeOf(x__2359__auto____10550)];
      if(or__3824__auto____10551) {
        return or__3824__auto____10551
      }else {
        var or__3824__auto____10552 = cljs.core._remove_method["_"];
        if(or__3824__auto____10552) {
          return or__3824__auto____10552
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-remove-method", mf);
        }
      }
    }().call(null, mf, dispatch_val)
  }
};
cljs.core._prefer_method = function _prefer_method(mf, dispatch_val, dispatch_val_y) {
  if(function() {
    var and__3822__auto____10557 = mf;
    if(and__3822__auto____10557) {
      return mf.cljs$core$IMultiFn$_prefer_method$arity$3
    }else {
      return and__3822__auto____10557
    }
  }()) {
    return mf.cljs$core$IMultiFn$_prefer_method$arity$3(mf, dispatch_val, dispatch_val_y)
  }else {
    var x__2359__auto____10558 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10559 = cljs.core._prefer_method[goog.typeOf(x__2359__auto____10558)];
      if(or__3824__auto____10559) {
        return or__3824__auto____10559
      }else {
        var or__3824__auto____10560 = cljs.core._prefer_method["_"];
        if(or__3824__auto____10560) {
          return or__3824__auto____10560
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-prefer-method", mf);
        }
      }
    }().call(null, mf, dispatch_val, dispatch_val_y)
  }
};
cljs.core._get_method = function _get_method(mf, dispatch_val) {
  if(function() {
    var and__3822__auto____10565 = mf;
    if(and__3822__auto____10565) {
      return mf.cljs$core$IMultiFn$_get_method$arity$2
    }else {
      return and__3822__auto____10565
    }
  }()) {
    return mf.cljs$core$IMultiFn$_get_method$arity$2(mf, dispatch_val)
  }else {
    var x__2359__auto____10566 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10567 = cljs.core._get_method[goog.typeOf(x__2359__auto____10566)];
      if(or__3824__auto____10567) {
        return or__3824__auto____10567
      }else {
        var or__3824__auto____10568 = cljs.core._get_method["_"];
        if(or__3824__auto____10568) {
          return or__3824__auto____10568
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-get-method", mf);
        }
      }
    }().call(null, mf, dispatch_val)
  }
};
cljs.core._methods = function _methods(mf) {
  if(function() {
    var and__3822__auto____10573 = mf;
    if(and__3822__auto____10573) {
      return mf.cljs$core$IMultiFn$_methods$arity$1
    }else {
      return and__3822__auto____10573
    }
  }()) {
    return mf.cljs$core$IMultiFn$_methods$arity$1(mf)
  }else {
    var x__2359__auto____10574 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10575 = cljs.core._methods[goog.typeOf(x__2359__auto____10574)];
      if(or__3824__auto____10575) {
        return or__3824__auto____10575
      }else {
        var or__3824__auto____10576 = cljs.core._methods["_"];
        if(or__3824__auto____10576) {
          return or__3824__auto____10576
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-methods", mf);
        }
      }
    }().call(null, mf)
  }
};
cljs.core._prefers = function _prefers(mf) {
  if(function() {
    var and__3822__auto____10581 = mf;
    if(and__3822__auto____10581) {
      return mf.cljs$core$IMultiFn$_prefers$arity$1
    }else {
      return and__3822__auto____10581
    }
  }()) {
    return mf.cljs$core$IMultiFn$_prefers$arity$1(mf)
  }else {
    var x__2359__auto____10582 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10583 = cljs.core._prefers[goog.typeOf(x__2359__auto____10582)];
      if(or__3824__auto____10583) {
        return or__3824__auto____10583
      }else {
        var or__3824__auto____10584 = cljs.core._prefers["_"];
        if(or__3824__auto____10584) {
          return or__3824__auto____10584
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-prefers", mf);
        }
      }
    }().call(null, mf)
  }
};
cljs.core._dispatch = function _dispatch(mf, args) {
  if(function() {
    var and__3822__auto____10589 = mf;
    if(and__3822__auto____10589) {
      return mf.cljs$core$IMultiFn$_dispatch$arity$2
    }else {
      return and__3822__auto____10589
    }
  }()) {
    return mf.cljs$core$IMultiFn$_dispatch$arity$2(mf, args)
  }else {
    var x__2359__auto____10590 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10591 = cljs.core._dispatch[goog.typeOf(x__2359__auto____10590)];
      if(or__3824__auto____10591) {
        return or__3824__auto____10591
      }else {
        var or__3824__auto____10592 = cljs.core._dispatch["_"];
        if(or__3824__auto____10592) {
          return or__3824__auto____10592
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-dispatch", mf);
        }
      }
    }().call(null, mf, args)
  }
};
cljs.core.do_dispatch = function do_dispatch(mf, dispatch_fn, args) {
  var dispatch_val__10595 = cljs.core.apply.call(null, dispatch_fn, args);
  var target_fn__10596 = cljs.core._get_method.call(null, mf, dispatch_val__10595);
  if(cljs.core.truth_(target_fn__10596)) {
  }else {
    throw new Error([cljs.core.str("No method in multimethod '"), cljs.core.str(cljs.core.name), cljs.core.str("' for dispatch value: "), cljs.core.str(dispatch_val__10595)].join(""));
  }
  return cljs.core.apply.call(null, target_fn__10596, args)
};
cljs.core.MultiFn = function(name, dispatch_fn, default_dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy) {
  this.name = name;
  this.dispatch_fn = dispatch_fn;
  this.default_dispatch_val = default_dispatch_val;
  this.hierarchy = hierarchy;
  this.method_table = method_table;
  this.prefer_table = prefer_table;
  this.method_cache = method_cache;
  this.cached_hierarchy = cached_hierarchy;
  this.cljs$lang$protocol_mask$partition0$ = 4194304;
  this.cljs$lang$protocol_mask$partition1$ = 64
};
cljs.core.MultiFn.cljs$lang$type = true;
cljs.core.MultiFn.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/MultiFn")
};
cljs.core.MultiFn.prototype.cljs$core$IHash$_hash$arity$1 = function(this$) {
  var this__10597 = this;
  return goog.getUid(this$)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_reset$arity$1 = function(mf) {
  var this__10598 = this;
  cljs.core.swap_BANG_.call(null, this__10598.method_table, function(mf) {
    return cljs.core.ObjMap.EMPTY
  });
  cljs.core.swap_BANG_.call(null, this__10598.method_cache, function(mf) {
    return cljs.core.ObjMap.EMPTY
  });
  cljs.core.swap_BANG_.call(null, this__10598.prefer_table, function(mf) {
    return cljs.core.ObjMap.EMPTY
  });
  cljs.core.swap_BANG_.call(null, this__10598.cached_hierarchy, function(mf) {
    return null
  });
  return mf
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_add_method$arity$3 = function(mf, dispatch_val, method) {
  var this__10599 = this;
  cljs.core.swap_BANG_.call(null, this__10599.method_table, cljs.core.assoc, dispatch_val, method);
  cljs.core.reset_cache.call(null, this__10599.method_cache, this__10599.method_table, this__10599.cached_hierarchy, this__10599.hierarchy);
  return mf
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_remove_method$arity$2 = function(mf, dispatch_val) {
  var this__10600 = this;
  cljs.core.swap_BANG_.call(null, this__10600.method_table, cljs.core.dissoc, dispatch_val);
  cljs.core.reset_cache.call(null, this__10600.method_cache, this__10600.method_table, this__10600.cached_hierarchy, this__10600.hierarchy);
  return mf
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_get_method$arity$2 = function(mf, dispatch_val) {
  var this__10601 = this;
  if(cljs.core._EQ_.call(null, cljs.core.deref.call(null, this__10601.cached_hierarchy), cljs.core.deref.call(null, this__10601.hierarchy))) {
  }else {
    cljs.core.reset_cache.call(null, this__10601.method_cache, this__10601.method_table, this__10601.cached_hierarchy, this__10601.hierarchy)
  }
  var temp__3971__auto____10602 = cljs.core.deref.call(null, this__10601.method_cache).call(null, dispatch_val);
  if(cljs.core.truth_(temp__3971__auto____10602)) {
    var target_fn__10603 = temp__3971__auto____10602;
    return target_fn__10603
  }else {
    var temp__3971__auto____10604 = cljs.core.find_and_cache_best_method.call(null, this__10601.name, dispatch_val, this__10601.hierarchy, this__10601.method_table, this__10601.prefer_table, this__10601.method_cache, this__10601.cached_hierarchy);
    if(cljs.core.truth_(temp__3971__auto____10604)) {
      var target_fn__10605 = temp__3971__auto____10604;
      return target_fn__10605
    }else {
      return cljs.core.deref.call(null, this__10601.method_table).call(null, this__10601.default_dispatch_val)
    }
  }
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_prefer_method$arity$3 = function(mf, dispatch_val_x, dispatch_val_y) {
  var this__10606 = this;
  if(cljs.core.truth_(cljs.core.prefers_STAR_.call(null, dispatch_val_x, dispatch_val_y, this__10606.prefer_table))) {
    throw new Error([cljs.core.str("Preference conflict in multimethod '"), cljs.core.str(this__10606.name), cljs.core.str("': "), cljs.core.str(dispatch_val_y), cljs.core.str(" is already preferred to "), cljs.core.str(dispatch_val_x)].join(""));
  }else {
  }
  cljs.core.swap_BANG_.call(null, this__10606.prefer_table, function(old) {
    return cljs.core.assoc.call(null, old, dispatch_val_x, cljs.core.conj.call(null, cljs.core._lookup.call(null, old, dispatch_val_x, cljs.core.PersistentHashSet.EMPTY), dispatch_val_y))
  });
  return cljs.core.reset_cache.call(null, this__10606.method_cache, this__10606.method_table, this__10606.cached_hierarchy, this__10606.hierarchy)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_methods$arity$1 = function(mf) {
  var this__10607 = this;
  return cljs.core.deref.call(null, this__10607.method_table)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_prefers$arity$1 = function(mf) {
  var this__10608 = this;
  return cljs.core.deref.call(null, this__10608.prefer_table)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_dispatch$arity$2 = function(mf, args) {
  var this__10609 = this;
  return cljs.core.do_dispatch.call(null, mf, this__10609.dispatch_fn, args)
};
cljs.core.MultiFn;
cljs.core.MultiFn.prototype.call = function() {
  var G__10611__delegate = function(_, args) {
    var self__10610 = this;
    return cljs.core._dispatch.call(null, self__10610, args)
  };
  var G__10611 = function(_, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return G__10611__delegate.call(this, _, args)
  };
  G__10611.cljs$lang$maxFixedArity = 1;
  G__10611.cljs$lang$applyTo = function(arglist__10612) {
    var _ = cljs.core.first(arglist__10612);
    var args = cljs.core.rest(arglist__10612);
    return G__10611__delegate(_, args)
  };
  G__10611.cljs$lang$arity$variadic = G__10611__delegate;
  return G__10611
}();
cljs.core.MultiFn.prototype.apply = function(_, args) {
  var self__10613 = this;
  return cljs.core._dispatch.call(null, self__10613, args)
};
cljs.core.remove_all_methods = function remove_all_methods(multifn) {
  return cljs.core._reset.call(null, multifn)
};
cljs.core.remove_method = function remove_method(multifn, dispatch_val) {
  return cljs.core._remove_method.call(null, multifn, dispatch_val)
};
cljs.core.prefer_method = function prefer_method(multifn, dispatch_val_x, dispatch_val_y) {
  return cljs.core._prefer_method.call(null, multifn, dispatch_val_x, dispatch_val_y)
};
cljs.core.methods$ = function methods$(multifn) {
  return cljs.core._methods.call(null, multifn)
};
cljs.core.get_method = function get_method(multifn, dispatch_val) {
  return cljs.core._get_method.call(null, multifn, dispatch_val)
};
cljs.core.prefers = function prefers(multifn) {
  return cljs.core._prefers.call(null, multifn)
};
cljs.core.UUID = function(uuid) {
  this.uuid = uuid;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 543162368
};
cljs.core.UUID.cljs$lang$type = true;
cljs.core.UUID.cljs$lang$ctorPrSeq = function(this__2305__auto__) {
  return cljs.core.list.call(null, "cljs.core/UUID")
};
cljs.core.UUID.prototype.cljs$core$IHash$_hash$arity$1 = function(this$) {
  var this__10614 = this;
  return goog.string.hashCode(cljs.core.pr_str.call(null, this$))
};
cljs.core.UUID.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(_10616, _) {
  var this__10615 = this;
  return cljs.core.list.call(null, [cljs.core.str('#uuid "'), cljs.core.str(this__10615.uuid), cljs.core.str('"')].join(""))
};
cljs.core.UUID.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(_, other) {
  var this__10617 = this;
  var and__3822__auto____10618 = cljs.core.instance_QMARK_.call(null, cljs.core.UUID, other);
  if(and__3822__auto____10618) {
    return this__10617.uuid === other.uuid
  }else {
    return and__3822__auto____10618
  }
};
cljs.core.UUID.prototype.toString = function() {
  var this__10619 = this;
  var this__10620 = this;
  return cljs.core.pr_str.call(null, this__10620)
};
cljs.core.UUID;
goog.provide("jayq.util");
goog.require("cljs.core");
jayq.util.map__GT_js = function map__GT_js(m) {
  var out__10641 = {};
  var G__10642__10643 = cljs.core.seq.call(null, m);
  if(G__10642__10643) {
    var G__10645__10647 = cljs.core.first.call(null, G__10642__10643);
    var vec__10646__10648 = G__10645__10647;
    var k__10649 = cljs.core.nth.call(null, vec__10646__10648, 0, null);
    var v__10650 = cljs.core.nth.call(null, vec__10646__10648, 1, null);
    var G__10642__10651 = G__10642__10643;
    var G__10645__10652 = G__10645__10647;
    var G__10642__10653 = G__10642__10651;
    while(true) {
      var vec__10654__10655 = G__10645__10652;
      var k__10656 = cljs.core.nth.call(null, vec__10654__10655, 0, null);
      var v__10657 = cljs.core.nth.call(null, vec__10654__10655, 1, null);
      var G__10642__10658 = G__10642__10653;
      out__10641[cljs.core.name.call(null, k__10656)] = v__10657;
      var temp__3974__auto____10659 = cljs.core.next.call(null, G__10642__10658);
      if(temp__3974__auto____10659) {
        var G__10642__10660 = temp__3974__auto____10659;
        var G__10661 = cljs.core.first.call(null, G__10642__10660);
        var G__10662 = G__10642__10660;
        G__10645__10652 = G__10661;
        G__10642__10653 = G__10662;
        continue
      }else {
      }
      break
    }
  }else {
  }
  return out__10641
};
jayq.util.wait = function wait(ms, func) {
  return setTimeout(func, ms)
};
jayq.util.log = function() {
  var log__delegate = function(v, text) {
    var vs__10664 = cljs.core.string_QMARK_.call(null, v) ? cljs.core.apply.call(null, cljs.core.str, v, text) : v;
    return console.log(vs__10664)
  };
  var log = function(v, var_args) {
    var text = null;
    if(goog.isDef(var_args)) {
      text = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return log__delegate.call(this, v, text)
  };
  log.cljs$lang$maxFixedArity = 1;
  log.cljs$lang$applyTo = function(arglist__10665) {
    var v = cljs.core.first(arglist__10665);
    var text = cljs.core.rest(arglist__10665);
    return log__delegate(v, text)
  };
  log.cljs$lang$arity$variadic = log__delegate;
  return log
}();
jayq.util.clj__GT_js = function clj__GT_js(x) {
  if(cljs.core.string_QMARK_.call(null, x)) {
    return x
  }else {
    if(cljs.core.keyword_QMARK_.call(null, x)) {
      return cljs.core.name.call(null, x)
    }else {
      if(cljs.core.map_QMARK_.call(null, x)) {
        return cljs.core.reduce.call(null, function(m, p__10671) {
          var vec__10672__10673 = p__10671;
          var k__10674 = cljs.core.nth.call(null, vec__10672__10673, 0, null);
          var v__10675 = cljs.core.nth.call(null, vec__10672__10673, 1, null);
          return cljs.core.assoc.call(null, m, clj__GT_js.call(null, k__10674), clj__GT_js.call(null, v__10675))
        }, cljs.core.ObjMap.EMPTY, x).strobj
      }else {
        if(cljs.core.coll_QMARK_.call(null, x)) {
          return cljs.core.apply.call(null, cljs.core.array, cljs.core.map.call(null, clj__GT_js, x))
        }else {
          if("\ufdd0'else") {
            return x
          }else {
            return null
          }
        }
      }
    }
  }
};
goog.provide("clojure.string");
goog.require("cljs.core");
goog.require("goog.string.StringBuffer");
goog.require("goog.string");
clojure.string.seq_reverse = function seq_reverse(coll) {
  return cljs.core.reduce.call(null, cljs.core.conj, cljs.core.List.EMPTY, coll)
};
clojure.string.reverse = function reverse(s) {
  return s.split("").reverse().join("")
};
clojure.string.replace = function replace(s, match, replacement) {
  if(cljs.core.string_QMARK_.call(null, match)) {
    return s.replace(new RegExp(goog.string.regExpEscape(match), "g"), replacement)
  }else {
    if(cljs.core.truth_(match.hasOwnProperty("source"))) {
      return s.replace(new RegExp(match.source, "g"), replacement)
    }else {
      if("\ufdd0'else") {
        throw[cljs.core.str("Invalid match arg: "), cljs.core.str(match)].join("");
      }else {
        return null
      }
    }
  }
};
clojure.string.replace_first = function replace_first(s, match, replacement) {
  return s.replace(match, replacement)
};
clojure.string.join = function() {
  var join = null;
  var join__1 = function(coll) {
    return cljs.core.apply.call(null, cljs.core.str, coll)
  };
  var join__2 = function(separator, coll) {
    return cljs.core.apply.call(null, cljs.core.str, cljs.core.interpose.call(null, separator, coll))
  };
  join = function(separator, coll) {
    switch(arguments.length) {
      case 1:
        return join__1.call(this, separator);
      case 2:
        return join__2.call(this, separator, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  join.cljs$lang$arity$1 = join__1;
  join.cljs$lang$arity$2 = join__2;
  return join
}();
clojure.string.upper_case = function upper_case(s) {
  return s.toUpperCase()
};
clojure.string.lower_case = function lower_case(s) {
  return s.toLowerCase()
};
clojure.string.capitalize = function capitalize(s) {
  if(cljs.core.count.call(null, s) < 2) {
    return clojure.string.upper_case.call(null, s)
  }else {
    return[cljs.core.str(clojure.string.upper_case.call(null, cljs.core.subs.call(null, s, 0, 1))), cljs.core.str(clojure.string.lower_case.call(null, cljs.core.subs.call(null, s, 1)))].join("")
  }
};
clojure.string.split = function() {
  var split = null;
  var split__2 = function(s, re) {
    return cljs.core.vec.call(null, [cljs.core.str(s)].join("").split(re))
  };
  var split__3 = function(s, re, limit) {
    if(limit < 1) {
      return cljs.core.vec.call(null, [cljs.core.str(s)].join("").split(re))
    }else {
      var s__10843 = s;
      var limit__10844 = limit;
      var parts__10845 = cljs.core.PersistentVector.EMPTY;
      while(true) {
        if(cljs.core._EQ_.call(null, limit__10844, 1)) {
          return cljs.core.conj.call(null, parts__10845, s__10843)
        }else {
          var temp__3971__auto____10846 = cljs.core.re_find.call(null, re, s__10843);
          if(cljs.core.truth_(temp__3971__auto____10846)) {
            var m__10847 = temp__3971__auto____10846;
            var index__10848 = s__10843.indexOf(m__10847);
            var G__10849 = s__10843.substring(index__10848 + cljs.core.count.call(null, m__10847));
            var G__10850 = limit__10844 - 1;
            var G__10851 = cljs.core.conj.call(null, parts__10845, s__10843.substring(0, index__10848));
            s__10843 = G__10849;
            limit__10844 = G__10850;
            parts__10845 = G__10851;
            continue
          }else {
            return cljs.core.conj.call(null, parts__10845, s__10843)
          }
        }
        break
      }
    }
  };
  split = function(s, re, limit) {
    switch(arguments.length) {
      case 2:
        return split__2.call(this, s, re);
      case 3:
        return split__3.call(this, s, re, limit)
    }
    throw"Invalid arity: " + arguments.length;
  };
  split.cljs$lang$arity$2 = split__2;
  split.cljs$lang$arity$3 = split__3;
  return split
}();
clojure.string.split_lines = function split_lines(s) {
  return clojure.string.split.call(null, s, /\n|\r\n/)
};
clojure.string.trim = function trim(s) {
  return goog.string.trim(s)
};
clojure.string.triml = function triml(s) {
  return goog.string.trimLeft(s)
};
clojure.string.trimr = function trimr(s) {
  return goog.string.trimRight(s)
};
clojure.string.trim_newline = function trim_newline(s) {
  var index__10855 = s.length;
  while(true) {
    if(index__10855 === 0) {
      return""
    }else {
      var ch__10856 = cljs.core._lookup.call(null, s, index__10855 - 1, null);
      if(function() {
        var or__3824__auto____10857 = cljs.core._EQ_.call(null, ch__10856, "\n");
        if(or__3824__auto____10857) {
          return or__3824__auto____10857
        }else {
          return cljs.core._EQ_.call(null, ch__10856, "\r")
        }
      }()) {
        var G__10858 = index__10855 - 1;
        index__10855 = G__10858;
        continue
      }else {
        return s.substring(0, index__10855)
      }
    }
    break
  }
};
clojure.string.blank_QMARK_ = function blank_QMARK_(s) {
  var s__10862 = [cljs.core.str(s)].join("");
  if(cljs.core.truth_(function() {
    var or__3824__auto____10863 = cljs.core.not.call(null, s__10862);
    if(or__3824__auto____10863) {
      return or__3824__auto____10863
    }else {
      var or__3824__auto____10864 = cljs.core._EQ_.call(null, "", s__10862);
      if(or__3824__auto____10864) {
        return or__3824__auto____10864
      }else {
        return cljs.core.re_matches.call(null, /\s+/, s__10862)
      }
    }
  }())) {
    return true
  }else {
    return false
  }
};
clojure.string.escape = function escape(s, cmap) {
  var buffer__10871 = new goog.string.StringBuffer;
  var length__10872 = s.length;
  var index__10873 = 0;
  while(true) {
    if(cljs.core._EQ_.call(null, length__10872, index__10873)) {
      return buffer__10871.toString()
    }else {
      var ch__10874 = s.charAt(index__10873);
      var temp__3971__auto____10875 = cljs.core._lookup.call(null, cmap, ch__10874, null);
      if(cljs.core.truth_(temp__3971__auto____10875)) {
        var replacement__10876 = temp__3971__auto____10875;
        buffer__10871.append([cljs.core.str(replacement__10876)].join(""))
      }else {
        buffer__10871.append(ch__10874)
      }
      var G__10877 = index__10873 + 1;
      index__10873 = G__10877;
      continue
    }
    break
  }
};
goog.provide("jayq.core");
goog.require("cljs.core");
goog.require("jayq.util");
goog.require("jayq.util");
goog.require("clojure.string");
jayq.core.crate_meta = function crate_meta(func) {
  return func.prototype._crateGroup
};
jayq.core.__GT_selector = function __GT_selector(sel) {
  if(cljs.core.string_QMARK_.call(null, sel)) {
    return sel
  }else {
    if(cljs.core.fn_QMARK_.call(null, sel)) {
      var temp__3971__auto____10678 = jayq.core.crate_meta.call(null, sel);
      if(cljs.core.truth_(temp__3971__auto____10678)) {
        var cm__10679 = temp__3971__auto____10678;
        return[cljs.core.str("[crateGroup="), cljs.core.str(cm__10679), cljs.core.str("]")].join("")
      }else {
        return sel
      }
    }else {
      if(cljs.core.keyword_QMARK_.call(null, sel)) {
        return cljs.core.name.call(null, sel)
      }else {
        if("\ufdd0'else") {
          return sel
        }else {
          return null
        }
      }
    }
  }
};
jayq.core.$ = function() {
  var $__delegate = function(sel, p__10680) {
    var vec__10684__10685 = p__10680;
    var context__10686 = cljs.core.nth.call(null, vec__10684__10685, 0, null);
    if(cljs.core.not.call(null, context__10686)) {
      return jQuery(jayq.core.__GT_selector.call(null, sel))
    }else {
      return jQuery(jayq.core.__GT_selector.call(null, sel), context__10686)
    }
  };
  var $ = function(sel, var_args) {
    var p__10680 = null;
    if(goog.isDef(var_args)) {
      p__10680 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return $__delegate.call(this, sel, p__10680)
  };
  $.cljs$lang$maxFixedArity = 1;
  $.cljs$lang$applyTo = function(arglist__10687) {
    var sel = cljs.core.first(arglist__10687);
    var p__10680 = cljs.core.rest(arglist__10687);
    return $__delegate(sel, p__10680)
  };
  $.cljs$lang$arity$variadic = $__delegate;
  return $
}();
jQuery.prototype.cljs$core$IReduce$ = true;
jQuery.prototype.cljs$core$IReduce$_reduce$arity$2 = function(this$, f) {
  return cljs.core.ci_reduce.call(null, jayq.core.coll, f, cljs.core.first.call(null, this$), cljs.core.count.call(null, this$))
};
jQuery.prototype.cljs$core$IReduce$_reduce$arity$3 = function(this$, f, start) {
  return cljs.core.ci_reduce.call(null, jayq.core.coll, f, start, jayq.core.i)
};
jQuery.prototype.cljs$core$ILookup$ = true;
jQuery.prototype.cljs$core$ILookup$_lookup$arity$2 = function(this$, k) {
  var or__3824__auto____10688 = this$.slice(k, k + 1);
  if(cljs.core.truth_(or__3824__auto____10688)) {
    return or__3824__auto____10688
  }else {
    return null
  }
};
jQuery.prototype.cljs$core$ILookup$_lookup$arity$3 = function(this$, k, not_found) {
  return cljs.core._nth.call(null, this$, k, not_found)
};
jQuery.prototype.cljs$core$ISequential$ = true;
jQuery.prototype.cljs$core$IIndexed$ = true;
jQuery.prototype.cljs$core$IIndexed$_nth$arity$2 = function(this$, n) {
  if(n < cljs.core.count.call(null, this$)) {
    return this$.slice(n, n + 1)
  }else {
    return null
  }
};
jQuery.prototype.cljs$core$IIndexed$_nth$arity$3 = function(this$, n, not_found) {
  if(n < cljs.core.count.call(null, this$)) {
    return this$.slice(n, n + 1)
  }else {
    if(void 0 === not_found) {
      return null
    }else {
      return not_found
    }
  }
};
jQuery.prototype.cljs$core$ICounted$ = true;
jQuery.prototype.cljs$core$ICounted$_count$arity$1 = function(this$) {
  return this$.size()
};
jQuery.prototype.cljs$core$ISeq$ = true;
jQuery.prototype.cljs$core$ISeq$_first$arity$1 = function(this$) {
  return this$.get(0)
};
jQuery.prototype.cljs$core$ISeq$_rest$arity$1 = function(this$) {
  if(cljs.core.count.call(null, this$) > 1) {
    return this$.slice(1)
  }else {
    return cljs.core.list.call(null)
  }
};
jQuery.prototype.cljs$core$ISeqable$ = true;
jQuery.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  if(cljs.core.truth_(this$.get(0))) {
    return this$
  }else {
    return null
  }
};
jQuery.prototype.call = function() {
  var G__10689 = null;
  var G__10689__2 = function(_, k) {
    return cljs.core._lookup.call(null, this, k)
  };
  var G__10689__3 = function(_, k, not_found) {
    return cljs.core._lookup.call(null, this, k, not_found)
  };
  G__10689 = function(_, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__10689__2.call(this, _, k);
      case 3:
        return G__10689__3.call(this, _, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__10689
}();
jayq.core.anim = function anim(elem, props, dur) {
  return elem.animate(jayq.util.clj__GT_js.call(null, props), dur)
};
jayq.core.text = function text($elem, txt) {
  return $elem.text(txt)
};
jayq.core.css = function css($elem, opts) {
  if(cljs.core.keyword_QMARK_.call(null, opts)) {
    return $elem.css(cljs.core.name.call(null, opts))
  }else {
    return $elem.css(jayq.util.clj__GT_js.call(null, opts))
  }
};
jayq.core.attr = function() {
  var attr__delegate = function($elem, a, p__10690) {
    var vec__10695__10696 = p__10690;
    var v__10697 = cljs.core.nth.call(null, vec__10695__10696, 0, null);
    var a__10698 = cljs.core.name.call(null, a);
    if(cljs.core.not.call(null, v__10697)) {
      return $elem.attr(a__10698)
    }else {
      return $elem.attr(a__10698, v__10697)
    }
  };
  var attr = function($elem, a, var_args) {
    var p__10690 = null;
    if(goog.isDef(var_args)) {
      p__10690 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return attr__delegate.call(this, $elem, a, p__10690)
  };
  attr.cljs$lang$maxFixedArity = 2;
  attr.cljs$lang$applyTo = function(arglist__10699) {
    var $elem = cljs.core.first(arglist__10699);
    var a = cljs.core.first(cljs.core.next(arglist__10699));
    var p__10690 = cljs.core.rest(cljs.core.next(arglist__10699));
    return attr__delegate($elem, a, p__10690)
  };
  attr.cljs$lang$arity$variadic = attr__delegate;
  return attr
}();
jayq.core.data = function() {
  var data__delegate = function($elem, k, p__10700) {
    var vec__10705__10706 = p__10700;
    var v__10707 = cljs.core.nth.call(null, vec__10705__10706, 0, null);
    var k__10708 = cljs.core.name.call(null, k);
    if(cljs.core.not.call(null, v__10707)) {
      return $elem.data(k__10708)
    }else {
      return $elem.data(k__10708, v__10707)
    }
  };
  var data = function($elem, k, var_args) {
    var p__10700 = null;
    if(goog.isDef(var_args)) {
      p__10700 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return data__delegate.call(this, $elem, k, p__10700)
  };
  data.cljs$lang$maxFixedArity = 2;
  data.cljs$lang$applyTo = function(arglist__10709) {
    var $elem = cljs.core.first(arglist__10709);
    var k = cljs.core.first(cljs.core.next(arglist__10709));
    var p__10700 = cljs.core.rest(cljs.core.next(arglist__10709));
    return data__delegate($elem, k, p__10700)
  };
  data.cljs$lang$arity$variadic = data__delegate;
  return data
}();
jayq.core.add_class = function add_class($elem, cl) {
  var cl__10711 = cljs.core.name.call(null, cl);
  return $elem.addClass(cl__10711)
};
jayq.core.remove_class = function remove_class($elem, cl) {
  var cl__10713 = cljs.core.name.call(null, cl);
  return $elem.removeClass(cl__10713)
};
jayq.core.append = function append($elem, content) {
  return $elem.append(content)
};
jayq.core.prepend = function prepend($elem, content) {
  return $elem.prepend(content)
};
jayq.core.remove = function remove($elem) {
  return $elem.remove()
};
jayq.core.hide = function() {
  var hide__delegate = function($elem, p__10714) {
    var vec__10719__10720 = p__10714;
    var speed__10721 = cljs.core.nth.call(null, vec__10719__10720, 0, null);
    var on_finish__10722 = cljs.core.nth.call(null, vec__10719__10720, 1, null);
    return $elem.hide(speed__10721, on_finish__10722)
  };
  var hide = function($elem, var_args) {
    var p__10714 = null;
    if(goog.isDef(var_args)) {
      p__10714 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return hide__delegate.call(this, $elem, p__10714)
  };
  hide.cljs$lang$maxFixedArity = 1;
  hide.cljs$lang$applyTo = function(arglist__10723) {
    var $elem = cljs.core.first(arglist__10723);
    var p__10714 = cljs.core.rest(arglist__10723);
    return hide__delegate($elem, p__10714)
  };
  hide.cljs$lang$arity$variadic = hide__delegate;
  return hide
}();
jayq.core.show = function() {
  var show__delegate = function($elem, p__10724) {
    var vec__10729__10730 = p__10724;
    var speed__10731 = cljs.core.nth.call(null, vec__10729__10730, 0, null);
    var on_finish__10732 = cljs.core.nth.call(null, vec__10729__10730, 1, null);
    return $elem.show(speed__10731, on_finish__10732)
  };
  var show = function($elem, var_args) {
    var p__10724 = null;
    if(goog.isDef(var_args)) {
      p__10724 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return show__delegate.call(this, $elem, p__10724)
  };
  show.cljs$lang$maxFixedArity = 1;
  show.cljs$lang$applyTo = function(arglist__10733) {
    var $elem = cljs.core.first(arglist__10733);
    var p__10724 = cljs.core.rest(arglist__10733);
    return show__delegate($elem, p__10724)
  };
  show.cljs$lang$arity$variadic = show__delegate;
  return show
}();
jayq.core.toggle = function() {
  var toggle__delegate = function($elem, p__10734) {
    var vec__10739__10740 = p__10734;
    var speed__10741 = cljs.core.nth.call(null, vec__10739__10740, 0, null);
    var on_finish__10742 = cljs.core.nth.call(null, vec__10739__10740, 1, null);
    return $elem.toggle(speed__10741, on_finish__10742)
  };
  var toggle = function($elem, var_args) {
    var p__10734 = null;
    if(goog.isDef(var_args)) {
      p__10734 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return toggle__delegate.call(this, $elem, p__10734)
  };
  toggle.cljs$lang$maxFixedArity = 1;
  toggle.cljs$lang$applyTo = function(arglist__10743) {
    var $elem = cljs.core.first(arglist__10743);
    var p__10734 = cljs.core.rest(arglist__10743);
    return toggle__delegate($elem, p__10734)
  };
  toggle.cljs$lang$arity$variadic = toggle__delegate;
  return toggle
}();
jayq.core.fade_out = function() {
  var fade_out__delegate = function($elem, p__10744) {
    var vec__10749__10750 = p__10744;
    var speed__10751 = cljs.core.nth.call(null, vec__10749__10750, 0, null);
    var on_finish__10752 = cljs.core.nth.call(null, vec__10749__10750, 1, null);
    return $elem.fadeOut(speed__10751, on_finish__10752)
  };
  var fade_out = function($elem, var_args) {
    var p__10744 = null;
    if(goog.isDef(var_args)) {
      p__10744 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return fade_out__delegate.call(this, $elem, p__10744)
  };
  fade_out.cljs$lang$maxFixedArity = 1;
  fade_out.cljs$lang$applyTo = function(arglist__10753) {
    var $elem = cljs.core.first(arglist__10753);
    var p__10744 = cljs.core.rest(arglist__10753);
    return fade_out__delegate($elem, p__10744)
  };
  fade_out.cljs$lang$arity$variadic = fade_out__delegate;
  return fade_out
}();
jayq.core.fade_in = function() {
  var fade_in__delegate = function($elem, p__10754) {
    var vec__10759__10760 = p__10754;
    var speed__10761 = cljs.core.nth.call(null, vec__10759__10760, 0, null);
    var on_finish__10762 = cljs.core.nth.call(null, vec__10759__10760, 1, null);
    return $elem.fadeIn(speed__10761, on_finish__10762)
  };
  var fade_in = function($elem, var_args) {
    var p__10754 = null;
    if(goog.isDef(var_args)) {
      p__10754 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return fade_in__delegate.call(this, $elem, p__10754)
  };
  fade_in.cljs$lang$maxFixedArity = 1;
  fade_in.cljs$lang$applyTo = function(arglist__10763) {
    var $elem = cljs.core.first(arglist__10763);
    var p__10754 = cljs.core.rest(arglist__10763);
    return fade_in__delegate($elem, p__10754)
  };
  fade_in.cljs$lang$arity$variadic = fade_in__delegate;
  return fade_in
}();
jayq.core.slide_up = function() {
  var slide_up__delegate = function($elem, p__10764) {
    var vec__10769__10770 = p__10764;
    var speed__10771 = cljs.core.nth.call(null, vec__10769__10770, 0, null);
    var on_finish__10772 = cljs.core.nth.call(null, vec__10769__10770, 1, null);
    return $elem.slideUp(speed__10771, on_finish__10772)
  };
  var slide_up = function($elem, var_args) {
    var p__10764 = null;
    if(goog.isDef(var_args)) {
      p__10764 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return slide_up__delegate.call(this, $elem, p__10764)
  };
  slide_up.cljs$lang$maxFixedArity = 1;
  slide_up.cljs$lang$applyTo = function(arglist__10773) {
    var $elem = cljs.core.first(arglist__10773);
    var p__10764 = cljs.core.rest(arglist__10773);
    return slide_up__delegate($elem, p__10764)
  };
  slide_up.cljs$lang$arity$variadic = slide_up__delegate;
  return slide_up
}();
jayq.core.slide_down = function() {
  var slide_down__delegate = function($elem, p__10774) {
    var vec__10779__10780 = p__10774;
    var speed__10781 = cljs.core.nth.call(null, vec__10779__10780, 0, null);
    var on_finish__10782 = cljs.core.nth.call(null, vec__10779__10780, 1, null);
    return $elem.slideDown(speed__10781, on_finish__10782)
  };
  var slide_down = function($elem, var_args) {
    var p__10774 = null;
    if(goog.isDef(var_args)) {
      p__10774 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return slide_down__delegate.call(this, $elem, p__10774)
  };
  slide_down.cljs$lang$maxFixedArity = 1;
  slide_down.cljs$lang$applyTo = function(arglist__10783) {
    var $elem = cljs.core.first(arglist__10783);
    var p__10774 = cljs.core.rest(arglist__10783);
    return slide_down__delegate($elem, p__10774)
  };
  slide_down.cljs$lang$arity$variadic = slide_down__delegate;
  return slide_down
}();
jayq.core.parent = function parent($elem) {
  return $elem.parent()
};
jayq.core.find = function find($elem, selector) {
  return $elem.find(cljs.core.name.call(null, selector))
};
jayq.core.inner = function inner($elem, v) {
  return $elem.html(v)
};
jayq.core.empty = function empty($elem) {
  return $elem.empty()
};
jayq.core.val = function() {
  var val__delegate = function($elem, p__10784) {
    var vec__10788__10789 = p__10784;
    var v__10790 = cljs.core.nth.call(null, vec__10788__10789, 0, null);
    if(cljs.core.truth_(v__10790)) {
      return $elem.val(v__10790)
    }else {
      return $elem.val()
    }
  };
  var val = function($elem, var_args) {
    var p__10784 = null;
    if(goog.isDef(var_args)) {
      p__10784 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return val__delegate.call(this, $elem, p__10784)
  };
  val.cljs$lang$maxFixedArity = 1;
  val.cljs$lang$applyTo = function(arglist__10791) {
    var $elem = cljs.core.first(arglist__10791);
    var p__10784 = cljs.core.rest(arglist__10791);
    return val__delegate($elem, p__10784)
  };
  val.cljs$lang$arity$variadic = val__delegate;
  return val
}();
jayq.core.queue = function queue($elem, callback) {
  return $elem.queue(callback)
};
jayq.core.dequeue = function dequeue(elem) {
  return jayq.core.$.call(null, elem).dequeue()
};
jayq.core.document_ready = function document_ready(func) {
  return jayq.core.$.call(null, document).ready(func)
};
jayq.core.xhr = function xhr(p__10792, content, callback) {
  var vec__10798__10799 = p__10792;
  var method__10800 = cljs.core.nth.call(null, vec__10798__10799, 0, null);
  var uri__10801 = cljs.core.nth.call(null, vec__10798__10799, 1, null);
  var params__10802 = jayq.util.clj__GT_js.call(null, cljs.core.ObjMap.fromObject(["\ufdd0'type", "\ufdd0'data", "\ufdd0'success"], {"\ufdd0'type":clojure.string.upper_case.call(null, cljs.core.name.call(null, method__10800)), "\ufdd0'data":jayq.util.clj__GT_js.call(null, content), "\ufdd0'success":callback}));
  return jQuery.ajax(uri__10801, params__10802)
};
jayq.core.bind = function bind($elem, ev, func) {
  return $elem.bind(cljs.core.name.call(null, ev), func)
};
jayq.core.trigger = function trigger($elem, ev) {
  return $elem.trigger(cljs.core.name.call(null, ev))
};
jayq.core.delegate = function delegate($elem, sel, ev, func) {
  return $elem.delegate(jayq.core.__GT_selector.call(null, sel), cljs.core.name.call(null, ev), func)
};
jayq.core.__GT_event = function __GT_event(e) {
  if(cljs.core.keyword_QMARK_.call(null, e)) {
    return cljs.core.name.call(null, e)
  }else {
    if(cljs.core.map_QMARK_.call(null, e)) {
      return jayq.util.clj__GT_js.call(null, e)
    }else {
      if(cljs.core.coll_QMARK_.call(null, e)) {
        return clojure.string.join.call(null, " ", cljs.core.map.call(null, cljs.core.name, e))
      }else {
        if("\ufdd0'else") {
          throw new Error([cljs.core.str("Unknown event type: "), cljs.core.str(e)].join(""));
        }else {
          return null
        }
      }
    }
  }
};
jayq.core.on = function() {
  var on__delegate = function($elem, events, p__10803) {
    var vec__10809__10810 = p__10803;
    var sel__10811 = cljs.core.nth.call(null, vec__10809__10810, 0, null);
    var data__10812 = cljs.core.nth.call(null, vec__10809__10810, 1, null);
    var handler__10813 = cljs.core.nth.call(null, vec__10809__10810, 2, null);
    return $elem.on(jayq.core.__GT_event.call(null, events), jayq.core.__GT_selector.call(null, sel__10811), data__10812, handler__10813)
  };
  var on = function($elem, events, var_args) {
    var p__10803 = null;
    if(goog.isDef(var_args)) {
      p__10803 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return on__delegate.call(this, $elem, events, p__10803)
  };
  on.cljs$lang$maxFixedArity = 2;
  on.cljs$lang$applyTo = function(arglist__10814) {
    var $elem = cljs.core.first(arglist__10814);
    var events = cljs.core.first(cljs.core.next(arglist__10814));
    var p__10803 = cljs.core.rest(cljs.core.next(arglist__10814));
    return on__delegate($elem, events, p__10803)
  };
  on.cljs$lang$arity$variadic = on__delegate;
  return on
}();
jayq.core.one = function() {
  var one__delegate = function($elem, events, p__10815) {
    var vec__10821__10822 = p__10815;
    var sel__10823 = cljs.core.nth.call(null, vec__10821__10822, 0, null);
    var data__10824 = cljs.core.nth.call(null, vec__10821__10822, 1, null);
    var handler__10825 = cljs.core.nth.call(null, vec__10821__10822, 2, null);
    return $elem.one(jayq.core.__GT_event.call(null, events), jayq.core.__GT_selector.call(null, sel__10823), data__10824, handler__10825)
  };
  var one = function($elem, events, var_args) {
    var p__10815 = null;
    if(goog.isDef(var_args)) {
      p__10815 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return one__delegate.call(this, $elem, events, p__10815)
  };
  one.cljs$lang$maxFixedArity = 2;
  one.cljs$lang$applyTo = function(arglist__10826) {
    var $elem = cljs.core.first(arglist__10826);
    var events = cljs.core.first(cljs.core.next(arglist__10826));
    var p__10815 = cljs.core.rest(cljs.core.next(arglist__10826));
    return one__delegate($elem, events, p__10815)
  };
  one.cljs$lang$arity$variadic = one__delegate;
  return one
}();
jayq.core.off = function() {
  var off__delegate = function($elem, events, p__10827) {
    var vec__10832__10833 = p__10827;
    var sel__10834 = cljs.core.nth.call(null, vec__10832__10833, 0, null);
    var handler__10835 = cljs.core.nth.call(null, vec__10832__10833, 1, null);
    return $elem.off(jayq.core.__GT_event.call(null, events), jayq.core.__GT_selector.call(null, sel__10834), handler__10835)
  };
  var off = function($elem, events, var_args) {
    var p__10827 = null;
    if(goog.isDef(var_args)) {
      p__10827 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return off__delegate.call(this, $elem, events, p__10827)
  };
  off.cljs$lang$maxFixedArity = 2;
  off.cljs$lang$applyTo = function(arglist__10836) {
    var $elem = cljs.core.first(arglist__10836);
    var events = cljs.core.first(cljs.core.next(arglist__10836));
    var p__10827 = cljs.core.rest(cljs.core.next(arglist__10836));
    return off__delegate($elem, events, p__10827)
  };
  off.cljs$lang$arity$variadic = off__delegate;
  return off
}();
goog.provide("fb.misc");
goog.require("cljs.core");
goog.require("jayq.util");
goog.require("jayq.core");
goog.require("jayq.util");
goog.require("jayq.core");
fb.misc.mk_settings = function mk_settings(r) {
  var i__969412 = r.rows.item(0);
  return cljs.core.ObjMap.fromObject(["\ufdd0'menuOn", "\ufdd0'help", "\ufdd0'menuPos"], {"\ufdd0'menuOn":cljs.core._EQ_.call(null, 1, i__969412.menuOn), "\ufdd0'help":cljs.core._EQ_.call(null, 1, i__969412.help), "\ufdd0'menuPos":cljs.core._EQ_.call(null, 1, i__969412.menuPos) ? "\ufdd0'top" : "\ufdd0'bottom"})
};
fb.misc.add_data = function add_data(elt, name, data) {
  var temp__3971__auto____969420 = name.call(null, data);
  if(cljs.core.truth_(temp__3971__auto____969420)) {
    var d__969421 = temp__3971__auto____969420;
    return cljs.core.reduce.call(null, function(e, p__969422) {
      var vec__969423__969424 = p__969422;
      var k__969425 = cljs.core.nth.call(null, vec__969423__969424, 0, null);
      var v__969426 = cljs.core.nth.call(null, vec__969423__969424, 1, null);
      return e.data(k__969425, v__969426)
    }, elt, d__969421)
  }else {
    return elt
  }
};
fb.misc.trim = function trim(s) {
  return s.replace(/^(.*\S)\s*$/, "$1")
};
fb.misc.num = function num(n) {
  return Number(n)
};
goog.provide("fb.init");
goog.require("cljs.core");
goog.require("jayq.core");
goog.require("jayq.core");
fb.init.inits = cljs.core.ObjMap.fromObject(["\ufdd0'any", "\ufdd0'last"], {"\ufdd0'any":cljs.core.PersistentVector.EMPTY, "\ufdd0'last":cljs.core.PersistentVector.EMPTY});
fb.init.add_init_BANG_ = function() {
  var add_init_BANG_ = null;
  var add_init_BANG___1 = function(f) {
    fb.init.inits = cljs.core.ObjMap.fromObject(["\ufdd0'any", "\ufdd0'last"], {"\ufdd0'any":cljs.core.conj.call(null, (new cljs.core.Keyword("\ufdd0'any")).call(null, fb.init.inits), f), "\ufdd0'last":(new cljs.core.Keyword("\ufdd0'last")).call(null, fb.init.inits)})
  };
  var add_init_BANG___2 = function(f, last) {
    fb.init.inits = cljs.core.ObjMap.fromObject(["\ufdd0'last", "\ufdd0'any"], {"\ufdd0'last":cljs.core.conj.call(null, (new cljs.core.Keyword("\ufdd0'last")).call(null, fb.init.inits), f), "\ufdd0'any":(new cljs.core.Keyword("\ufdd0'any")).call(null, fb.init.inits)})
  };
  add_init_BANG_ = function(f, last) {
    switch(arguments.length) {
      case 1:
        return add_init_BANG___1.call(this, f);
      case 2:
        return add_init_BANG___2.call(this, f, last)
    }
    throw"Invalid arity: " + arguments.length;
  };
  add_init_BANG_.cljs$lang$arity$1 = add_init_BANG___1;
  add_init_BANG_.cljs$lang$arity$2 = add_init_BANG___2;
  return add_init_BANG_
}();
fb.init.do_inits = function do_inits() {
  return jayq.core.$.call(null, function() {
    var G__1128200__1128201 = cljs.core.seq.call(null, cljs.core.concat.call(null, (new cljs.core.Keyword("\ufdd0'any")).call(null, fb.init.inits), (new cljs.core.Keyword("\ufdd0'last")).call(null, fb.init.inits)));
    if(G__1128200__1128201) {
      var f__1128202 = cljs.core.first.call(null, G__1128200__1128201);
      var G__1128200__1128203 = G__1128200__1128201;
      while(true) {
        f__1128202.call(null);
        var temp__3974__auto____1128204 = cljs.core.next.call(null, G__1128200__1128203);
        if(temp__3974__auto____1128204) {
          var G__1128200__1128205 = temp__3974__auto____1128204;
          var G__1128206 = cljs.core.first.call(null, G__1128200__1128205);
          var G__1128207 = G__1128200__1128205;
          f__1128202 = G__1128206;
          G__1128200__1128203 = G__1128207;
          continue
        }else {
          return null
        }
        break
      }
    }else {
      return null
    }
  })
};
goog.provide("fb.sql");
goog.require("cljs.core");
goog.require("fb.init");
goog.require("jayq.util");
goog.require("jayq.core");
goog.require("fb.misc");
goog.require("fb.init");
goog.require("fb.misc");
goog.require("jayq.util");
goog.require("jayq.core");
fb.sql.do_select = function do_select(f, rq) {
  return fb.sql.db.transaction(function(t) {
    return t.executeSql(rq, jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.EMPTY), f, function(p1__1083973_SHARP_, p2__1083972_SHARP_) {
      return alert([cljs.core.str("fuck. "), cljs.core.str(p2__1083972_SHARP_.message)].join(""))
    })
  })
};
fb.sql.init_settings = function init_settings(t, r) {
  return t.executeSql("SELECT * FROM settings;", jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.EMPTY), function(p1__1083975_SHARP_, p2__1083974_SHARP_) {
    if(p2__1083974_SHARP_.rows.length === 0) {
      return p1__1083975_SHARP_.executeSql("INSERT INTO settings (menuPos, menuOn, help) VALUES (1, 1, 1);")
    }else {
      return null
    }
  })
};
fb.sql.add_db_BANG_ = function() {
  var add_db_BANG___delegate = function(name, schema, p__1083976) {
    var vec__1083982__1083983 = p__1083976;
    var f__1083984 = cljs.core.nth.call(null, vec__1083982__1083983, 0, null);
    var n__1083985 = cljs.core.apply.call(null, cljs.core.str, cljs.core.next.call(null, [cljs.core.str(name)].join("")));
    return fb.sql.db.transaction(function(t) {
      var rq__1083986 = [cljs.core.str("CREATE TABLE IF NOT EXISTS "), cljs.core.str(n__1083985), cljs.core.str(" ( "), cljs.core.str(schema), cljs.core.str(" );")].join("");
      if(cljs.core.truth_(f__1083984)) {
        return t.executeSql(rq__1083986, jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.EMPTY), f__1083984)
      }else {
        return t.executeSql(rq__1083986)
      }
    })
  };
  var add_db_BANG_ = function(name, schema, var_args) {
    var p__1083976 = null;
    if(goog.isDef(var_args)) {
      p__1083976 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return add_db_BANG___delegate.call(this, name, schema, p__1083976)
  };
  add_db_BANG_.cljs$lang$maxFixedArity = 2;
  add_db_BANG_.cljs$lang$applyTo = function(arglist__1083987) {
    var name = cljs.core.first(arglist__1083987);
    var schema = cljs.core.first(cljs.core.next(arglist__1083987));
    var p__1083976 = cljs.core.rest(cljs.core.next(arglist__1083987));
    return add_db_BANG___delegate(name, schema, p__1083976)
  };
  add_db_BANG_.cljs$lang$arity$variadic = add_db_BANG___delegate;
  return add_db_BANG_
}();
fb.sql.db_init = function db_init() {
  fb.sql.db = openDatabase("projs", "1.0", "projs", 65536);
  fb.sql.add_db_BANG_.call(null, "\ufdd0'projects", [cljs.core.str(" id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"), cljs.core.str(" name TEXT NOT NULL")].join(""));
  fb.sql.add_db_BANG_.call(null, "\ufdd0'buddies", [cljs.core.str(" id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"), cljs.core.str(" pid  INTEGER NOT NULL,"), cljs.core.str(" name TEXT NOT NULL,"), cljs.core.str(" img  TEXT NOT NULL")].join(""));
  fb.sql.add_db_BANG_.call(null, "\ufdd0'costs", [cljs.core.str(" id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"), cljs.core.str(" pid  INTEGER NOT NULL,"), cljs.core.str(" name TEXT NOT NULL,"), cljs.core.str(" tot  NUMERIC NOT NULL")].join(""));
  fb.sql.add_db_BANG_.call(null, "\ufdd0'settings", [cljs.core.str(" id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"), cljs.core.str(" menuPos INTEGER NOT NULL,"), cljs.core.str(" menuOn INTEGER NOT NULL,"), cljs.core.str(" help INTEGER NOT NULL")].join(""), fb.sql.init_settings);
  return fb.sql.add_db_BANG_.call(null, "\ufdd0'relcbp", [cljs.core.str(" id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"), cljs.core.str(" pid  INTEGER NOT NULL,"), cljs.core.str(" bid  INTEGER NOT NULL,"), cljs.core.str(" cid  INTEGER NOT NULL,"), cljs.core.str(" tot  NUMERIC NOT NULL")].join(""))
};
fb.init.add_init_BANG_.call(null, fb.sql.db_init);
fb.sql.update_settings = function update_settings(settings, f) {
  return fb.sql.db.transaction(function(t) {
    return t.executeSql("UPDATE settings SET menuPos = ?, menuOn = ?, help = ? WHERE id = 1;", jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.fromArray([cljs.core._EQ_.call(null, "\ufdd0'top", (new cljs.core.Keyword("\ufdd0'menuPos")).call(null, settings)) ? 1 : 0, cljs.core.truth_((new cljs.core.Keyword("\ufdd0'menuOn")).call(null, settings)) ? 1 : 0, cljs.core.truth_((new cljs.core.Keyword("\ufdd0'help")).call(null, settings)) ? 1 : 0], true)), f)
  })
};
fb.sql.do_settings = function do_settings(f) {
  var rq__1083991 = [cljs.core.str("SELECT settings.menuOn, settings.menuPos, settings.help FROM settings "), cljs.core.str(" ;")].join("");
  return fb.sql.do_select.call(null, function(p1__1083989_SHARP_, p2__1083988_SHARP_) {
    return f.call(null, fb.misc.mk_settings.call(null, p2__1083988_SHARP_))
  }, rq__1083991)
};
fb.sql.add_proj = function add_proj(name, f) {
  return fb.sql.db.transaction(function(t) {
    return t.executeSql("INSERT INTO projects (name) VALUES (?);", jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.fromArray([fb.misc.trim.call(null, name)], true)), f)
  })
};
fb.sql.add_buddy = function add_buddy(proj, name, img, f) {
  return fb.sql.db.transaction(function(t) {
    return t.executeSql("INSERT INTO buddies (name, pid, img) VALUES (?, ?, ?);", jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.fromArray([fb.misc.trim.call(null, name), proj, img], true)), f, function(p1__1083993_SHARP_, p2__1083992_SHARP_) {
      return alert([cljs.core.str("fuck. "), cljs.core.str(p2__1083992_SHARP_.message)].join(""))
    })
  })
};
fb.sql.up_buddy = function up_buddy(bid, name, img, f) {
  return fb.sql.db.transaction(function(t) {
    return t.executeSql([cljs.core.str("UPDATE buddies SET name = ?, img = ? WHERE id = "), cljs.core.str(bid), cljs.core.str("; ")].join(""), jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.fromArray([fb.misc.trim.call(null, name), img], true)), f)
  })
};
fb.sql.up_cost = function up_cost(cid, name, buddies_add, buddies_up, buddies_rm, proj, amount, f) {
  var do_cbud__1084015 = function(f, rq, vals) {
    return function(t, r) {
      return t.executeSql(rq, jayq.util.clj__GT_js.call(null, vals), f, function(p1__1083995_SHARP_, p2__1083994_SHARP_) {
        return alert([cljs.core.str("fuck. "), cljs.core.str(p2__1083994_SHARP_.message)].join(""))
      })
    }
  };
  var addrq__1084016 = "INSERT INTO relcbp (pid, bid, cid, tot) VALUES (?, ?, ?, ?);";
  var uprq__1084017 = function(p1__1083996_SHARP_) {
    return[cljs.core.str("UPDATE relcbp SET tot = ? WHERE id = "), cljs.core.str(p1__1083996_SHARP_), cljs.core.str(";")].join("")
  };
  var rmrq__1084018 = function(p1__1083997_SHARP_) {
    return[cljs.core.str("DELETE FROM relcbp WHERE id = "), cljs.core.str(p1__1083997_SHARP_), cljs.core.str(";")].join("")
  };
  var fns__1084019 = cljs.core.reduce.call(null, function(p1__1083998_SHARP_, p2__1083999_SHARP_) {
    return do_cbud__1084015.call(null, p1__1083998_SHARP_, addrq__1084016, cljs.core.PersistentVector.fromArray([proj, cljs.core.first.call(null, p2__1083999_SHARP_), cid, cljs.core.second.call(null, p2__1083999_SHARP_)], true))
  }, f, buddies_add);
  var fns__1084020 = cljs.core.reduce.call(null, function(p1__1084000_SHARP_, p2__1084001_SHARP_) {
    return do_cbud__1084015.call(null, p1__1084000_SHARP_, uprq__1084017.call(null, cljs.core.first.call(null, p2__1084001_SHARP_)), cljs.core.PersistentVector.fromArray([cljs.core.second.call(null, p2__1084001_SHARP_)], true))
  }, fns__1084019, buddies_up);
  var fns__1084021 = cljs.core.reduce.call(null, function(p1__1084002_SHARP_, p2__1084003_SHARP_) {
    return do_cbud__1084015.call(null, p1__1084002_SHARP_, rmrq__1084018.call(null, cljs.core.first.call(null, p2__1084003_SHARP_)), cljs.core.PersistentVector.EMPTY)
  }, fns__1084020, buddies_rm);
  return fb.sql.db.transaction(function(t) {
    return t.executeSql([cljs.core.str("UPDATE costs SET name = ?, pid = ?, tot = ? WHERE id = "), cljs.core.str(cid), cljs.core.str("; ")].join(""), jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.fromArray([fb.misc.trim.call(null, name), proj, amount], true)), fns__1084021)
  })
};
fb.sql.add_cost = function add_cost(name, buddies, proj, amount, f) {
  var do_cbud__1084023 = function(f, vals) {
    return function(t, r) {
      return t.executeSql("INSERT INTO relcbp (pid, bid, cid, tot) VALUES (?, ?, ?, ?);", jayq.util.clj__GT_js.call(null, vals), f, function(p1__1084005_SHARP_, p2__1084004_SHARP_) {
        return alert([cljs.core.str("fuck. "), cljs.core.str(p2__1084004_SHARP_.message)].join(""))
      })
    }
  };
  return fb.sql.db.transaction(function(t) {
    return t.executeSql("INSERT INTO costs (name, pid, tot) VALUES (?, ?, ?);", jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.fromArray([fb.misc.trim.call(null, name), proj, amount], true)), function(t, r) {
      return cljs.core.reduce.call(null, function(p1__1084006_SHARP_, p2__1084007_SHARP_) {
        return do_cbud__1084023.call(null, p1__1084006_SHARP_, cljs.core.PersistentVector.fromArray([proj, cljs.core.first.call(null, p2__1084007_SHARP_), r.insertId, cljs.core.second.call(null, p2__1084007_SHARP_)], true))
      }, f, buddies).call(null, t, r)
    })
  })
};
fb.sql.do_proj = function() {
  var do_proj__delegate = function(f, p__1084024) {
    var vec__1084029__1084030 = p__1084024;
    var id__1084031 = cljs.core.nth.call(null, vec__1084029__1084030, 0, null);
    var rq__1084032 = cljs.core.truth_(id__1084031) ? [cljs.core.str("SELECT projects.id, projects.name, SUM(relcbp.tot) AS tot, settings.menuOn, settings.menuPos, settings.help FROM projects, relcbp, settings "), cljs.core.str("WHERE projects.id = "), cljs.core.str(id__1084031), cljs.core.str(" AND relcbp.pid = projects.id "), cljs.core.str("GROUP BY projects.id "), cljs.core.str("UNION ALL SELECT  projects.id, projects.name, 0 AS tot, settings.menuOn, settings.menuPos, settings.help FROM projects, settings "), 
    cljs.core.str("WHERE projects.id = "), cljs.core.str(id__1084031), cljs.core.str(" AND NOT EXISTS (SELECT * FROM relcbp WHERE projects.id = relcbp.pid )"), cljs.core.str(" ;")].join("") : "SELECT * FROM projects;";
    return fb.sql.do_select.call(null, f, rq__1084032)
  };
  var do_proj = function(f, var_args) {
    var p__1084024 = null;
    if(goog.isDef(var_args)) {
      p__1084024 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return do_proj__delegate.call(this, f, p__1084024)
  };
  do_proj.cljs$lang$maxFixedArity = 1;
  do_proj.cljs$lang$applyTo = function(arglist__1084033) {
    var f = cljs.core.first(arglist__1084033);
    var p__1084024 = cljs.core.rest(arglist__1084033);
    return do_proj__delegate(f, p__1084024)
  };
  do_proj.cljs$lang$arity$variadic = do_proj__delegate;
  return do_proj
}();
fb.sql.do_costs = function do_costs(f, id) {
  var rq__1084035 = [cljs.core.str("SELECT costs.name, costs.id, SUM(relcbp.tot) AS tot FROM costs, relcbp "), cljs.core.str("WHERE costs.pid = "), cljs.core.str(id), cljs.core.str(" "), cljs.core.str("AND relcbp.cid = costs.id "), cljs.core.str("GROUP BY costs.id "), cljs.core.str(";")].join("");
  return fb.sql.do_select.call(null, f, rq__1084035)
};
fb.sql.do_cost = function do_cost(f, id) {
  var rq__1084037 = [cljs.core.str("SELECT costs.name AS cname, buddies.name AS bname, costs.tot AS ctot, relcbp.tot AS btot, relcbp.id, relcbp.bid, relcbp.cid "), cljs.core.str("FROM costs, relcbp, buddies "), cljs.core.str("WHERE costs.id = "), cljs.core.str(id), cljs.core.str(" AND relcbp.cid = costs.id AND relcbp.bid = buddies.id;")].join("");
  return fb.sql.do_select.call(null, f, rq__1084037)
};
fb.sql.do_buddy = function do_buddy(f, id) {
  var rq__1084039 = [cljs.core.str("SELECT costs.name AS cname, buddies.name AS bname, costs.tot AS ctot, relcbp.tot AS btot "), cljs.core.str("FROM costs, relcbp, buddies "), cljs.core.str("WHERE relcbp.bid = "), cljs.core.str(id), cljs.core.str(" AND relcbp.cid = costs.id AND relcbp.bid = buddies.id "), cljs.core.str("GROUP BY costs.id "), cljs.core.str("UNION ALL SELECT 0 AS cname, buddies.name AS bname, 0 AS ctot, 0 AS btot FROM buddies "), cljs.core.str("WHERE buddies.id = "), cljs.core.str(id), 
  cljs.core.str(" "), cljs.core.str("AND NOT EXISTS (SELECT * FROM relcbp WHERE relcbp.bid = "), cljs.core.str(id), cljs.core.str(" );")].join("");
  return fb.sql.do_select.call(null, f, rq__1084039)
};
fb.sql.do_row = function do_row(f, r) {
  var G__1084046__1084047 = cljs.core.seq.call(null, cljs.core.range.call(null, r.rows.length));
  if(G__1084046__1084047) {
    var i__1084048 = cljs.core.first.call(null, G__1084046__1084047);
    var G__1084046__1084049 = G__1084046__1084047;
    while(true) {
      f.call(null, r.rows.item(i__1084048));
      var temp__3974__auto____1084050 = cljs.core.next.call(null, G__1084046__1084049);
      if(temp__3974__auto____1084050) {
        var G__1084046__1084051 = temp__3974__auto____1084050;
        var G__1084052 = cljs.core.first.call(null, G__1084046__1084051);
        var G__1084053 = G__1084046__1084051;
        i__1084048 = G__1084052;
        G__1084046__1084049 = G__1084053;
        continue
      }else {
        return null
      }
      break
    }
  }else {
    return null
  }
};
fb.sql.row_seq = function row_seq(r) {
  var iter__2458__auto____1084067 = function iter__1084061(s__1084062) {
    return new cljs.core.LazySeq(null, false, function() {
      var s__1084062__1084065 = s__1084062;
      while(true) {
        if(cljs.core.seq.call(null, s__1084062__1084065)) {
          var i__1084066 = cljs.core.first.call(null, s__1084062__1084065);
          return cljs.core.cons.call(null, r.rows.item(i__1084066), iter__1084061.call(null, cljs.core.rest.call(null, s__1084062__1084065)))
        }else {
          return null
        }
        break
      }
    }, null)
  };
  return iter__2458__auto____1084067.call(null, cljs.core.range.call(null, r.rows.length))
};
fb.sql.do_buddies = function() {
  var do_buddies__delegate = function(f, pid, p__1084072) {
    var vec__1084077__1084078 = p__1084072;
    var cid__1084079 = cljs.core.nth.call(null, vec__1084077__1084078, 0, null);
    var rq__1084080 = cljs.core.truth_(cid__1084079) ? [cljs.core.str("SELECT buddies.name AS bname, buddies.id, buddies.img, relcbp.tot AS btot, SUM(costs.tot) AS ptot, costs.name AS cname, relcbp.id AS rid "), cljs.core.str("FROM buddies, relcbp, costs "), cljs.core.str("WHERE buddies.id = relcbp.bid AND buddies.pid = "), cljs.core.str(pid), cljs.core.str(" and relcbp.pid = "), cljs.core.str(pid), cljs.core.str(" AND costs.pid = "), cljs.core.str(pid), cljs.core.str(" AND relcbp.cid = costs.id "), 
    cljs.core.str("AND relcbp.cid = "), cljs.core.str(cid__1084079), cljs.core.str(" "), cljs.core.str("GROUP BY buddies.id "), cljs.core.str("UNION ALL SELECT buddies.name, buddies.id, buddies.img, 0 AS btot, 0 AS ptot, 0 AS cname, 0 AS rid FROM buddies "), cljs.core.str("WHERE buddies.pid = "), cljs.core.str(pid), cljs.core.str(" "), cljs.core.str("AND NOT EXISTS (SELECT * FROM relcbp WHERE buddies.id = relcbp.bid AND relcbp.cid = "), cljs.core.str(cid__1084079), cljs.core.str(" ) "), cljs.core.str(" ;")].join("") : 
    [cljs.core.str("SELECT buddies.name AS bname, buddies.id, buddies.img, SUM(relcbp.tot) AS btot, SUM(costs.tot) AS ptot "), cljs.core.str("FROM buddies, relcbp, costs "), cljs.core.str("WHERE buddies.id = relcbp.bid AND buddies.pid = "), cljs.core.str(pid), cljs.core.str(" and relcbp.pid = "), cljs.core.str(pid), cljs.core.str(" AND costs.pid = "), cljs.core.str(pid), cljs.core.str(" AND relcbp.cid = costs.id "), cljs.core.str("GROUP BY buddies.id "), cljs.core.str("UNION ALL SELECT buddies.name, buddies.id, buddies.img, 0 AS btot, 100 AS ptot FROM buddies "), 
    cljs.core.str("WHERE buddies.pid = "), cljs.core.str(pid), cljs.core.str(" "), cljs.core.str("AND NOT EXISTS (SELECT * FROM relcbp, costs WHERE buddies.id = relcbp.bid AND buddies.pid = relcbp.pid AND relcbp.cid = costs.id AND costs.pid = buddies.pid)"), cljs.core.str(" ;")].join("");
    return fb.sql.do_select.call(null, f, rq__1084080)
  };
  var do_buddies = function(f, pid, var_args) {
    var p__1084072 = null;
    if(goog.isDef(var_args)) {
      p__1084072 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return do_buddies__delegate.call(this, f, pid, p__1084072)
  };
  do_buddies.cljs$lang$maxFixedArity = 2;
  do_buddies.cljs$lang$applyTo = function(arglist__1084081) {
    var f = cljs.core.first(arglist__1084081);
    var pid = cljs.core.first(cljs.core.next(arglist__1084081));
    var p__1084072 = cljs.core.rest(cljs.core.next(arglist__1084081));
    return do_buddies__delegate(f, pid, p__1084072)
  };
  do_buddies.cljs$lang$arity$variadic = do_buddies__delegate;
  return do_buddies
}();
fb.sql.rm = function() {
  var rm__delegate = function(rq, p__1084082) {
    var vec__1084086__1084087 = p__1084082;
    var f__1084088 = cljs.core.nth.call(null, vec__1084086__1084087, 0, null);
    return function(t, r) {
      if(cljs.core.truth_(f__1084088)) {
        return t.executeSql(rq, jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.EMPTY), f__1084088, function(p1__1084069_SHARP_, p2__1084068_SHARP_) {
          return alert([cljs.core.str("rm fuck. "), cljs.core.str(p2__1084068_SHARP_.message)].join(""))
        })
      }else {
        return t.executeSql(rq, jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.EMPTY), null, function(p1__1084071_SHARP_, p2__1084070_SHARP_) {
          return alert([cljs.core.str("rm fuck. "), cljs.core.str(p2__1084070_SHARP_.message)].join(""))
        })
      }
    }
  };
  var rm = function(rq, var_args) {
    var p__1084082 = null;
    if(goog.isDef(var_args)) {
      p__1084082 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return rm__delegate.call(this, rq, p__1084082)
  };
  rm.cljs$lang$maxFixedArity = 1;
  rm.cljs$lang$applyTo = function(arglist__1084089) {
    var rq = cljs.core.first(arglist__1084089);
    var p__1084082 = cljs.core.rest(arglist__1084089);
    return rm__delegate(rq, p__1084082)
  };
  rm.cljs$lang$arity$variadic = rm__delegate;
  return rm
}();
fb.sql.rm_proj = function rm_proj(f, pid) {
  var rq_p__1084094 = [cljs.core.str("DELETE FROM projects WHERE projects.id = "), cljs.core.str(pid), cljs.core.str(" ;")].join("");
  var rq_b__1084095 = [cljs.core.str("DELETE FROM buddies WHERE buddies.pid = "), cljs.core.str(pid), cljs.core.str(" ;")].join("");
  var rq_c__1084096 = [cljs.core.str("DELETE FROM costs WHERE costs.pid = "), cljs.core.str(pid), cljs.core.str(" ;")].join("");
  var rq_r__1084097 = [cljs.core.str("DELETE FROM relcbp WHERE relcbp.pid = "), cljs.core.str(pid), cljs.core.str(" ;")].join("");
  return fb.sql.db.transaction(fb.sql.rm.call(null, rq_p__1084094, fb.sql.rm.call(null, rq_b__1084095, fb.sql.rm.call(null, rq_c__1084096, fb.sql.rm.call(null, rq_r__1084097, f)))))
};
fb.sql.rm_cost = function rm_cost(f, cid) {
  var rq_c__1084100 = [cljs.core.str("DELETE FROM costs WHERE costs.id = "), cljs.core.str(cid), cljs.core.str(" ;")].join("");
  var rq_r__1084101 = [cljs.core.str("DELETE FROM relcbp WHERE relcbp.cid = "), cljs.core.str(cid), cljs.core.str(" ;")].join("");
  return fb.sql.db.transaction(fb.sql.rm.call(null, rq_c__1084100, fb.sql.rm.call(null, rq_r__1084101, f)))
};
fb.sql.rm_buddy = function rm_buddy(f, bid) {
  var rq_c__1084112 = [cljs.core.str("DELETE FROM buddies WHERE buddies.id = "), cljs.core.str(bid), cljs.core.str(" ;")].join("");
  var rq_r__1084113 = [cljs.core.str("DELETE FROM relcbp WHERE relcbp.bid = "), cljs.core.str(bid), cljs.core.str(" ;")].join("");
  return fb.sql.db.transaction(fb.sql.rm.call(null, rq_c__1084112, fb.sql.rm.call(null, rq_r__1084113, f)))
};
fb.sql.nuke_db = function nuke_db() {
  return fb.sql.db.transaction(function(t) {
    return t.executeSql("DROP TABLE IF EXISTS projects;", jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.EMPTY), function(t, r) {
      return t.executeSql("DROP TABLE buddies;", jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.EMPTY), function(t, r) {
        return t.executeSql("DROP TABLE costs;", jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.EMPTY), function(t, r) {
          return t.executeSql("DROP TABLE relcbp;", jayq.util.clj__GT_js.call(null, cljs.core.PersistentVector.EMPTY), function() {
            return alert([cljs.core.str("dropped.")].join(""))
          }, function(p1__1084103_SHARP_, p2__1084102_SHARP_) {
            return alert([cljs.core.str("fuck. "), cljs.core.str(p2__1084102_SHARP_.message)].join(""))
          })
        }, function(p1__1084105_SHARP_, p2__1084104_SHARP_) {
          return alert([cljs.core.str("fuck. "), cljs.core.str(p2__1084104_SHARP_.message)].join(""))
        })
      }, function(p1__1084107_SHARP_, p2__1084106_SHARP_) {
        return alert([cljs.core.str("fuck. "), cljs.core.str(p2__1084106_SHARP_.message)].join(""))
      })
    }, function(p1__1084109_SHARP_, p2__1084108_SHARP_) {
      return alert([cljs.core.str("fuck. "), cljs.core.str(p2__1084108_SHARP_.message)].join(""))
    })
  })
};
goog.provide("fb.vis");
goog.require("cljs.core");
goog.require("jayq.util");
goog.require("fb.misc");
goog.require("jayq.core");
goog.require("fb.sql");
goog.require("fb.misc");
goog.require("fb.sql");
goog.require("jayq.util");
goog.require("jayq.core");
var sp__968625 = jayq.core.$.call(null, "<span></span>").addClass("money");
fb.vis.money = function money(amount) {
  return sp__968625.clone().text(function(p1__968624_SHARP_) {
    if(cljs.core._EQ_.call(null, 1, cljs.core.count.call(null, p1__968624_SHARP_))) {
      return"$0"
    }else {
      return p1__968624_SHARP_
    }
  }.call(null, [cljs.core.str(amount)].join("").replace(/^0*([0-9]*\.?[0-9]{0,2})?.*$/, "$$$1")))
};
var sp__968628 = jayq.core.$.call(null, "<span></span>").addClass("buddy");
fb.vis.buddy = function buddy(name) {
  return sp__968628.clone().text(name)
};
fb.vis.add_menu = function add_menu(pid, settings) {
  var place__968658 = cljs.core._EQ_.call(null, "\ufdd0'top", (new cljs.core.Keyword("\ufdd0'menuPos")).call(null, settings)) ? jayq.core.$.call(null, "#newpage div.top") : jayq.core.$.call(null, "#newpage div.bottom");
  var menu__968659 = jayq.core.$.call(null, "div.hidden div.menu").clone();
  place__968658.append(cljs.core.truth_((new cljs.core.Keyword("\ufdd0'menuOn")).call(null, settings)) ? menu__968659.show() : menu__968659.hide());
  var ulr__968660 = jayq.core.$.call(null, "#newpage div.menu div.right ul");
  var ull__968661 = jayq.core.$.call(null, "#newpage div.menu div.left ul");
  var li__968662 = jayq.core.$.call(null, "<li></li>");
  var a__968663 = jayq.core.$.call(null, "<a></a>");
  var data__968664 = cljs.core.ObjMap.fromObject(["settings"], {"settings":cljs.core.PersistentVector.fromArray([cljs.core.PersistentVector.fromArray(["anim", "flipright"], true)], true)});
  var ll__968665 = cljs.core.PersistentVector.fromArray([cljs.core.PersistentVector.fromArray(["Expenses", "proj"], true), cljs.core.PersistentVector.fromArray(["Buddies", "buddies"], true)], true);
  var lr__968666 = cljs.core.PersistentVector.fromArray([cljs.core.PersistentVector.fromArray(["Total", "total"], true), cljs.core.PersistentVector.fromArray(["Settings", "settings"], true)], true);
  var add__968686 = function(p1__968626_SHARP_, p2__968627_SHARP_) {
    var G__968667__968668 = cljs.core.seq.call(null, p1__968626_SHARP_);
    if(G__968667__968668) {
      var G__968670__968672 = cljs.core.first.call(null, G__968667__968668);
      var vec__968671__968673 = G__968670__968672;
      var t__968674 = cljs.core.nth.call(null, vec__968671__968673, 0, null);
      var l__968675 = cljs.core.nth.call(null, vec__968671__968673, 1, null);
      var G__968667__968676 = G__968667__968668;
      var G__968670__968677 = G__968670__968672;
      var G__968667__968678 = G__968667__968676;
      while(true) {
        var vec__968679__968680 = G__968670__968677;
        var t__968681 = cljs.core.nth.call(null, vec__968679__968680, 0, null);
        var l__968682 = cljs.core.nth.call(null, vec__968679__968680, 1, null);
        var G__968667__968683 = G__968667__968678;
        p2__968627_SHARP_.append(li__968662.clone().append(fb.misc.add_data.call(null, a__968663.clone().data("pid", pid).attr("href", l__968682).text(t__968681), l__968682, data__968664)));
        var temp__3974__auto____968684 = cljs.core.next.call(null, G__968667__968683);
        if(temp__3974__auto____968684) {
          var G__968667__968685 = temp__3974__auto____968684;
          var G__968687 = cljs.core.first.call(null, G__968667__968685);
          var G__968688 = G__968667__968685;
          G__968670__968677 = G__968687;
          G__968667__968678 = G__968688;
          continue
        }else {
          return null
        }
        break
      }
    }else {
      return null
    }
  };
  add__968686.call(null, ll__968665, ull__968661);
  return add__968686.call(null, lr__968666, ulr__968660)
};
fb.vis.set_title_project = function set_title_project(f, pid) {
  var sett__968710 = function(tx, r) {
    var i__968700 = r.rows.item(0);
    var n__968701 = i__968700.name;
    var id__968702 = i__968700.id;
    var tot__968703 = i__968700.tot;
    var settings__968704 = fb.misc.mk_settings.call(null, r);
    var a__968705 = jayq.core.$.call(null, "<a></a>");
    var help__968706 = jayq.core.$.call(null, "#newpage div.info");
    if(cljs.core.truth_((new cljs.core.Keyword("\ufdd0'help")).call(null, settings__968704))) {
      help__968706.show()
    }else {
      help__968706.hide()
    }
    jayq.core.$.call(null, "#newpage div.top").data("pid", pid).append(jayq.core.$.call(null, '<div class="toolbar"></div>').append(jayq.core.$.call(null, "<h1></h1>").append(a__968705.clone().attr("href", "proj").data("pid", pid).append([cljs.core.str(n__968701), cljs.core.str(": ")].join("")).append(fb.vis.money.call(null, tot__968703)))).append(a__968705.clone().addClass("back").addClass("button").attr("href", "back").text("Back")).append(a__968705.clone().addClass("button").attr("href", "menu").text("Menu").bind("click touchend", 
    function() {
      fb.sql.do_settings.call(null, function(settings) {
        var menu__968707 = jayq.core.$.call(null, "#content div.menu");
        var settings__968708 = cljs.core.into.call(null, settings, cljs.core.ObjMap.fromObject(["\ufdd0'menuOn"], {"\ufdd0'menuOn":cljs.core.not.call(null, (new cljs.core.Keyword("\ufdd0'menuOn")).call(null, settings))}));
        var on__968709 = (new cljs.core.Keyword("\ufdd0'menuOn")).call(null, settings__968708);
        return fb.sql.update_settings.call(null, settings__968708, function() {
          if(cljs.core.truth_(on__968709)) {
            return menu__968707.show()
          }else {
            return menu__968707.hide()
          }
        })
      });
      return false
    })));
    fb.vis.add_menu.call(null, pid, settings__968704);
    return f.call(null, id__968702, n__968701, tot__968703, tx)
  };
  return fb.sql.do_proj.call(null, sett__968710, pid)
};
fb.vis.canvas_rect = function canvas_rect(w_tot, h_tot, w) {
  var c__968713 = cljs.core.first.call(null, jayq.core.$.call(null, "<canvas></canvas>"));
  var ctx__968714 = c__968713.getContext("2d", w_tot, h_tot);
  c__968713.width = w_tot;
  c__968713.height = h_tot;
  ctx__968714.fillStyle = "#121";
  ctx__968714.fillRect(0, 0, w_tot, h_tot);
  ctx__968714.fillStyle = "#131";
  ctx__968714.fillRect(0, 0, w, h_tot);
  return ctx__968714
};
fb.vis.set_rect_back = function set_rect_back(elt, tot, amount) {
  var w__968719 = jayq.core.$.call(null, "body").width();
  var h__968720 = 50;
  var nw__968721 = cljs.core.int$.call(null, w__968719 * (amount / tot));
  var cvs__968722 = fb.vis.canvas_rect.call(null, w__968719, h__968720, nw__968721);
  return elt.css("background-image", [cljs.core.str("url("), cljs.core.str(cvs__968722.canvas.toDataURL("image/png")), cljs.core.str(")")].join("")).css("background-size", "100%")
};
fb.vis.canvas_rect_take = function canvas_rect_take(w_tot, h_tot, wpaid, avg, max) {
  var c__968725 = cljs.core.first.call(null, jayq.core.$.call(null, "<canvas></canvas>"));
  var ctx__968726 = c__968725.getContext("2d", w_tot, h_tot);
  c__968725.width = w_tot;
  c__968725.height = h_tot;
  ctx__968726.fillStyle = "#121";
  ctx__968726.fillRect(0, 0, w_tot, h_tot);
  ctx__968726.fillStyle = "#131";
  ctx__968726.fillRect(0, 0, avg, h_tot);
  ctx__968726.fillStyle = "#252";
  ctx__968726.fillRect(avg, 0, wpaid - avg, h_tot);
  ctx__968726.fillStyle = "#33F";
  ctx__968726.fillRect(avg, 0, 2, h_tot);
  return ctx__968726
};
fb.vis.canvas_rect_give = function canvas_rect_give(w_tot, h_tot, wpaid, avg) {
  var c__968729 = cljs.core.first.call(null, jayq.core.$.call(null, "<canvas></canvas>"));
  var ctx__968730 = c__968729.getContext("2d", w_tot, h_tot);
  c__968729.width = w_tot;
  c__968729.height = h_tot;
  ctx__968730.fillStyle = "#121";
  ctx__968730.fillRect(0, 0, w_tot, h_tot);
  ctx__968730.fillStyle = "#131";
  ctx__968730.fillRect(0, 0, wpaid, h_tot);
  ctx__968730.fillStyle = "#822";
  ctx__968730.fillRect(wpaid, 0, avg - wpaid, h_tot);
  ctx__968730.fillStyle = "#33F";
  ctx__968730.fillRect(avg, 0, 2, h_tot);
  return ctx__968730
};
fb.vis.set_tot_rect_back = function set_tot_rect_back(elt, max, avg, amount) {
  var w__968736 = jayq.core.$.call(null, "body").width();
  var h__968737 = 50;
  var np__968738 = cljs.core.int$.call(null, w__968736 * (amount / max));
  var na__968739 = cljs.core.int$.call(null, w__968736 * (avg / max));
  var cvs__968740 = (np__968738 > na__968739 ? fb.vis.canvas_rect_take : fb.vis.canvas_rect_give).call(null, w__968736, h__968737, np__968738, na__968739);
  return elt.css("background-image", [cljs.core.str("url("), cljs.core.str(cvs__968740.canvas.toDataURL("image/png")), cljs.core.str(")")].join("")).css("background-size", "100%")
};
goog.provide("fb.pages");
goog.require("cljs.core");
goog.require("fb.init");
goog.require("jayq.util");
goog.require("fb.vis");
goog.require("jayq.core");
goog.require("fb.misc");
goog.require("fb.sql");
goog.require("fb.init");
goog.require("fb.misc");
goog.require("fb.vis");
goog.require("fb.sql");
goog.require("jayq.util");
goog.require("jayq.core");
fb.pages.page_dyn_inits = cljs.core.ObjMap.EMPTY;
fb.pages.back_pages = null;
fb.pages.jQT = null;
fb.init.add_init_BANG_.call(null, function() {
  fb.pages.jQT = jQuery.jQTouch({"icon":"img/icon.png"})
});
fb.pages.add_page_init_BANG_ = function add_page_init_BANG_(name, func) {
  fb.pages.page_dyn_inits = cljs.core.into.call(null, fb.pages.page_dyn_inits, cljs.core.PersistentArrayMap.fromArrays([name], [func]))
};
fb.pages.load_template = function load_template(name) {
  var temp__1071963 = jayq.core.$.call(null, [cljs.core.str("div.hidden div."), cljs.core.str(name)].join(""));
  var temp__1071964 = temp__1071963.length === 0 ? jayq.core.$.call(null, "div.hidden div.404") : temp__1071963;
  var body__1071965 = jayq.core.$.call(null, "body");
  var newp__1071966 = jayq.core.$.call(null, '<div id="newpage"></div>').hide();
  return body__1071965.append(newp__1071966.append(jayq.core.$.call(null, '<div class="top"></div>')).append(jayq.core.$.call(null, '<div class="middle"></div>').append(temp__1071964.clone())).append(jayq.core.$.call(null, '<div class="bottom"></div>')).append())
};
fb.pages.swap_page = function swap_page(e, a) {
  var newp__1071970 = jayq.core.$.call(null, "#newpage").show();
  var cont__1071971 = jayq.core.$.call(null, "#content");
  var anim__1071972 = a.data("anim");
  if(cljs.core.truth_(anim__1071972)) {
    fb.pages.jQT.goTo("#newpage", anim__1071972)
  }else {
    fb.pages.jQT.goTo("#newpage", "slideleft")
  }
  newp__1071970.attr("id", "content");
  return cont__1071971.attr("id", "old")
};
fb.init.add_init_BANG_.call(null, function() {
  return jayq.core.$.call(null, "body").bind("pageAnimationEnd", function(e, info) {
    return jayq.core.$.call(null, "#old").remove()
  })
});
fb.pages.load_dyn_page = function load_dyn_page(name, e, a) {
  if(cljs.core._EQ_.call(null, name, "settings")) {
    var vec__1071983__1071985 = fb.pages.back_pages;
    var vec__1071984__1071986 = cljs.core.nth.call(null, vec__1071983__1071985, 0, null);
    var name__1071987 = cljs.core.nth.call(null, vec__1071984__1071986, 0, null);
    var data__1071988 = cljs.core.nth.call(null, vec__1071984__1071986, 1, null);
    var back_end__1071989 = cljs.core.nthnext.call(null, vec__1071983__1071985, 1);
    fb.pages.back_pages = cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([name__1071987, cljs.core.PersistentArrayMap.fromArrays([name__1071987], [cljs.core.replace.call(null, cljs.core.PersistentArrayMap.fromArrays([cljs.core.PersistentVector.fromArray(["anim", "slideright"], true)], [cljs.core.PersistentVector.fromArray(["anim", "flipleft"], true)]), name__1071987.call(null, data__1071988))])], true), back_end__1071989)
  }else {
  }
  if(cljs.core.not_EQ_.call(null, name, "back")) {
    fb.pages.back_pages = cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([name, cljs.core.PersistentArrayMap.fromArrays([name], [cljs.core.doall.call(null, cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray(["anim", "slideright"], true), cljs.core.map.call(null, function(p1__1071973_SHARP_) {
      return cljs.core.vector.call(null, p1__1071973_SHARP_, a.data(p1__1071973_SHARP_))
    }, cljs.core.PersistentVector.fromArray(["pid", "bid", "cid"], true))))])], true), cljs.core.take.call(null, 15, fb.pages.back_pages))
  }else {
  }
  var temp__3971__auto____1071990 = fb.pages.page_dyn_inits.call(null, name);
  if(cljs.core.truth_(temp__3971__auto____1071990)) {
    var f__1071991 = temp__3971__auto____1071990;
    return f__1071991.call(null, e, a)
  }else {
    fb.pages.load_template.call(null, name);
    return fb.pages.swap_page.call(null, e, a)
  }
};
fb.init.add_init_BANG_.call(null, function() {
  return jayq.core.delegate.call(null, jayq.core.$.call(null, "body"), "a", "click touchend", function(e) {
    var a__1071992 = jayq.core.$.call(null, cljs.core.first.call(null, jayq.core.$.call(null, e.currentTarget)));
    var link__1071993 = a__1071992.attr("href");
    if(cljs.core._EQ_.call(null, "mailto", cljs.core.apply.call(null, cljs.core.str, cljs.core.take.call(null, 6, link__1071993)))) {
      return true
    }else {
      fb.pages.load_dyn_page.call(null, link__1071993, e, a__1071992);
      return false
    }
  })
});
fb.pages.trigger_new_page = function trigger_new_page(href, data) {
  return fb.misc.add_data.call(null, jayq.core.$.call(null, "<a></a>").hide().attr("href", href), href, data).appendTo(jayq.core.$.call(null, "#content")).click()
};
fb.pages.go_back = function go_back(e) {
  var vec__1072002__1072004 = fb.pages.back_pages;
  var x__1072005 = cljs.core.nth.call(null, vec__1072002__1072004, 0, null);
  var vec__1072003__1072006 = cljs.core.nth.call(null, vec__1072002__1072004, 1, null);
  var name__1072007 = cljs.core.nth.call(null, vec__1072003__1072006, 0, null);
  var d__1072008 = cljs.core.nth.call(null, vec__1072003__1072006, 1, null);
  var bs__1072009 = cljs.core.nthnext.call(null, vec__1072002__1072004, 2);
  fb.pages.back_pages = bs__1072009;
  return fb.pages.trigger_new_page.call(null, name__1072007, d__1072008)
};
fb.pages.add_page_init_BANG_.call(null, "back", fb.pages.go_back);
goog.provide("fb.rm");
goog.require("cljs.core");
goog.require("jayq.util");
goog.require("fb.vis");
goog.require("fb.pages");
goog.require("jayq.core");
goog.require("fb.misc");
goog.require("fb.sql");
goog.require("fb.pages");
goog.require("fb.misc");
goog.require("fb.vis");
goog.require("fb.sql");
goog.require("jayq.util");
goog.require("jayq.core");
fb.rm.show_rm = function show_rm(e, origa) {
  fb.pages.load_template.call(null, "rm");
  var pid__968911 = origa.data("pid");
  var cid__968912 = origa.data("cid");
  var bid__968913 = origa.data("bid");
  var rmtype__968914 = origa.data("rm");
  var title__968915 = jayq.core.$.call(null, "#newpage div.rm div.toolbar h1");
  var menu__968916 = jayq.core.$.call(null, "#newpage div.rm div.toolbar");
  var ul__968917 = jayq.core.$.call(null, "#newpage div.rm ul");
  var li__968918 = jayq.core.$.call(null, "<li></li>");
  var a__968919 = jayq.core.$.call(null, "<a></a>");
  var rm_proj_page__968920 = function(e) {
    fb.sql.rm_proj.call(null, function() {
      return fb.pages.trigger_new_page.call(null, "projects", cljs.core.ObjMap.fromObject(["projects"], {"projects":cljs.core.PersistentVector.fromArray([cljs.core.PersistentVector.fromArray(["anim", "pop"], true)], true)}))
    }, pid__968911);
    return false
  };
  var rm_cost_page__968921 = function(e) {
    fb.sql.rm_cost.call(null, function() {
      return fb.pages.trigger_new_page.call(null, "proj", cljs.core.ObjMap.fromObject(["proj"], {"proj":cljs.core.PersistentVector.fromArray([cljs.core.PersistentVector.fromArray(["pid", pid__968911], true), cljs.core.PersistentVector.fromArray(["anim", "pop"], true)], true)}))
    }, cid__968912);
    return false
  };
  var rm_budd_page__968922 = function(e) {
    fb.sql.rm_buddy.call(null, function() {
      return fb.pages.trigger_new_page.call(null, "buddies", cljs.core.ObjMap.fromObject(["buddies"], {"buddies":cljs.core.PersistentVector.fromArray([cljs.core.PersistentVector.fromArray(["bid", bid__968913], true), cljs.core.PersistentVector.fromArray(["pid", pid__968911], true), cljs.core.PersistentVector.fromArray(["anim", "pop"], true)], true)}))
    }, bid__968913);
    return false
  };
  var set_rm_budd__968925 = function(t, r) {
    var i__968923 = r.rows.item(0);
    var tot__968924 = cljs.core.reduce.call(null, cljs.core._PLUS_, cljs.core.map.call(null, function(p1__968886_SHARP_) {
      return p1__968886_SHARP_.btot
    }, fb.sql.row_seq.call(null, r)));
    ul__968917.append(li__968918.clone().append([cljs.core.str("Delete buddy "), cljs.core.str(i__968923.bname), cljs.core.str("?")].join(""))).append(li__968918.clone().append([cljs.core.str("Total contribution: ")].join("")).append(fb.vis.money.call(null, tot__968924))).append(li__968918.clone().addClass("rmli").append(a__968919.clone().text("Delete").attr("href", "null").data("bid", bid__968913).bind("touchend click", rm_budd_page__968922)));
    return fb.pages.swap_page.call(null, e, origa)
  };
  var set_rm_cost__968927 = function(t, r) {
    var i__968926 = r.rows.item(0);
    ul__968917.append(li__968918.clone().append([cljs.core.str("Delete Expense "), cljs.core.str(i__968926.cname), cljs.core.str("?")].join(""))).append(li__968918.clone().append([cljs.core.str("Total: ")].join("")).append(fb.vis.money.call(null, i__968926.ctot))).append(li__968918.clone().addClass("rmli").append(a__968919.clone().text("Delete").attr("href", "null").data("cid", i__968926.id).bind("touchend click", rm_cost_page__968921)));
    return fb.pages.swap_page.call(null, e, origa)
  };
  var set_rm_proj__968929 = function(t, r) {
    var i__968928 = r.rows.item(0);
    ul__968917.append(li__968918.clone().text([cljs.core.str("Delete project "), cljs.core.str(i__968928.name), cljs.core.str("?")].join(""))).append(li__968918.clone().addClass("rmli").append(a__968919.clone().text("Delete").attr("href", "null").data("pid", i__968928.id).bind("touchend click", rm_proj_page__968920)));
    return fb.pages.swap_page.call(null, e, origa)
  };
  menu__968916.append(a__968919.clone().addClass("button").addClass("back").attr("href", "back").text("Cancel"));
  var pred__968930__968933 = cljs.core._EQ_;
  var expr__968931__968934 = rmtype__968914;
  if(pred__968930__968933.call(null, "cost", expr__968931__968934)) {
    return fb.sql.do_cost.call(null, set_rm_cost__968927, cid__968912)
  }else {
    if(pred__968930__968933.call(null, "buddy", expr__968931__968934)) {
      return fb.sql.do_buddy.call(null, set_rm_budd__968925, bid__968913)
    }else {
      if(pred__968930__968933.call(null, "proj", expr__968931__968934)) {
        return fb.sql.do_proj.call(null, set_rm_proj__968929, pid__968911)
      }else {
        throw new Error([cljs.core.str("No matching clause: "), cljs.core.str(expr__968931__968934)].join(""));
      }
    }
  }
};
fb.pages.add_page_init_BANG_.call(null, "rm", fb.rm.show_rm);
goog.provide("fb.proj");
goog.require("cljs.core");
goog.require("jayq.util");
goog.require("fb.vis");
goog.require("fb.pages");
goog.require("jayq.core");
goog.require("fb.misc");
goog.require("fb.sql");
goog.require("fb.pages");
goog.require("fb.misc");
goog.require("fb.vis");
goog.require("fb.sql");
goog.require("jayq.util");
goog.require("jayq.core");
fb.proj.add_page_project = function add_page_project() {
  var name__1063711 = jayq.core.$.call(null, '#content div.new form [name="name"]').val();
  var addp__1063712 = function(tx, r) {
    return fb.pages.trigger_new_page.call(null, "proj", cljs.core.ObjMap.fromObject(["proj"], {"proj":cljs.core.PersistentVector.fromArray([cljs.core.PersistentVector.fromArray(["pid", r.insertId], true)], true)}))
  };
  if(cljs.core.count.call(null, name__1063711) <= 0) {
    alert("Invalid name")
  }else {
    fb.sql.add_proj.call(null, name__1063711, addp__1063712)
  }
  return false
};
fb.proj.show_new_form = function show_new_form(e, origa) {
  fb.pages.load_template.call(null, "new");
  var addb__1063717 = jayq.core.$.call(null, "#newpage div.new form ul li a");
  var inp__1063718 = jayq.core.$.call(null, '#newpage div.new form [name="name"]');
  var validate__1063720 = function() {
    var z_QMARK___1063719 = cljs.core.count.call(null, inp__1063718.val()) === 0;
    if(z_QMARK___1063719) {
      return addb__1063717.hide()
    }else {
      return addb__1063717.show()
    }
  };
  addb__1063717.hide();
  inp__1063718.keyup(validate__1063720);
  jayq.core.$.call(null, "#newpage div.new form").submit(fb.proj.add_page_project);
  addb__1063717.bind("click touchend", fb.proj.add_page_project);
  return fb.pages.swap_page.call(null, e, origa)
};
fb.proj.show_projects = function show_projects(e, a) {
  fb.pages.load_template.call(null, "projects");
  var li__1063724 = jayq.core.$.call(null, "<li></li>");
  var ul__1063725 = jayq.core.$.call(null, "#newpage div ul").append(li__1063724.clone().addClass("addli").append(jayq.core.$.call(null, "<a></a>").text("New Project").attr("href", "new")));
  return fb.sql.do_proj.call(null, function(t, r) {
    fb.sql.do_row.call(null, function(i) {
      return ul__1063725.append(li__1063724.clone().append(jayq.core.$.call(null, "<a></a>").text(i.name).attr("href", "proj").data("pid", i.id)))
    }, r);
    return fb.pages.swap_page.call(null, e, a)
  })
};
fb.proj.show_proj = function show_proj(e, origa) {
  fb.pages.load_template.call(null, "proj");
  var pid__1063761 = origa.data("pid");
  var li__1063762 = jayq.core.$.call(null, "<li></li>");
  var a__1063763 = jayq.core.$.call(null, "<a></a>");
  var ul__1063764 = jayq.core.$.call(null, "#newpage div.proj ul").append(li__1063762.clone().addClass("addli").append(jayq.core.$.call(null, "<a></a>").text("Add Expense").data("pid", pid__1063761).attr("href", "newcost")));
  var set_proj_data__1063795 = function(id, name, tot, tx) {
    jayq.core.$.call(null, "#newpage div.proj div.menu a").data("pid", pid__1063761);
    fb.sql.do_costs.call(null, function(tx, r) {
      var costs__1063772 = function() {
        var iter__2458__auto____1063771 = function iter__1063765(s__1063766) {
          return new cljs.core.LazySeq(null, false, function() {
            var s__1063766__1063769 = s__1063766;
            while(true) {
              if(cljs.core.seq.call(null, s__1063766__1063769)) {
                var c__1063770 = cljs.core.first.call(null, s__1063766__1063769);
                return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([c__1063770.id, c__1063770.name, c__1063770.tot], true), iter__1063765.call(null, cljs.core.rest.call(null, s__1063766__1063769)))
              }else {
                return null
              }
              break
            }
          }, null)
        };
        return iter__2458__auto____1063771.call(null, fb.sql.row_seq.call(null, r))
      }();
      var maxpaid__1063773 = cljs.core.apply.call(null, cljs.core.max, cljs.core.map.call(null, function(p1__1063721_SHARP_) {
        return cljs.core.nth.call(null, p1__1063721_SHARP_, 2)
      }, costs__1063772));
      var G__1063774__1063775 = cljs.core.seq.call(null, costs__1063772);
      if(G__1063774__1063775) {
        var G__1063777__1063779 = cljs.core.first.call(null, G__1063774__1063775);
        var vec__1063778__1063780 = G__1063777__1063779;
        var cid__1063781 = cljs.core.nth.call(null, vec__1063778__1063780, 0, null);
        var name__1063782 = cljs.core.nth.call(null, vec__1063778__1063780, 1, null);
        var tot__1063783 = cljs.core.nth.call(null, vec__1063778__1063780, 2, null);
        var G__1063774__1063784 = G__1063774__1063775;
        var G__1063777__1063785 = G__1063777__1063779;
        var G__1063774__1063786 = G__1063774__1063784;
        while(true) {
          var vec__1063787__1063788 = G__1063777__1063785;
          var cid__1063789 = cljs.core.nth.call(null, vec__1063787__1063788, 0, null);
          var name__1063790 = cljs.core.nth.call(null, vec__1063787__1063788, 1, null);
          var tot__1063791 = cljs.core.nth.call(null, vec__1063787__1063788, 2, null);
          var G__1063774__1063792 = G__1063774__1063786;
          ul__1063764.append(fb.vis.set_rect_back.call(null, li__1063762.clone(), maxpaid__1063773, tot__1063791).append(a__1063763.clone().text([cljs.core.str(name__1063790), cljs.core.str(": ")].join("")).append(fb.vis.money.call(null, tot__1063791)).data("cid", cid__1063789).data("pid", pid__1063761).attr("href", "cost")));
          var temp__3974__auto____1063793 = cljs.core.next.call(null, G__1063774__1063792);
          if(temp__3974__auto____1063793) {
            var G__1063774__1063794 = temp__3974__auto____1063793;
            var G__1063796 = cljs.core.first.call(null, G__1063774__1063794);
            var G__1063797 = G__1063774__1063794;
            G__1063777__1063785 = G__1063796;
            G__1063774__1063786 = G__1063797;
            continue
          }else {
          }
          break
        }
      }else {
      }
      return ul__1063764.append(li__1063762.clone().addClass("rmli").append(a__1063763.clone().text("Delete Project").data("pid", pid__1063761).data("rm", "proj").data("anim", "pop").attr("href", "rm")))
    }, pid__1063761);
    return fb.pages.swap_page.call(null, e, origa)
  };
  return fb.vis.set_title_project.call(null, set_proj_data__1063795, pid__1063761)
};
fb.pages.add_page_init_BANG_.call(null, "projects", fb.proj.show_projects);
fb.pages.add_page_init_BANG_.call(null, "new", fb.proj.show_new_form);
fb.pages.add_page_init_BANG_.call(null, "proj", fb.proj.show_proj);
goog.provide("fb.buddies");
goog.require("cljs.core");
goog.require("jayq.util");
goog.require("fb.vis");
goog.require("fb.pages");
goog.require("jayq.core");
goog.require("fb.misc");
goog.require("fb.sql");
goog.require("fb.pages");
goog.require("fb.misc");
goog.require("fb.vis");
goog.require("fb.sql");
goog.require("jayq.util");
goog.require("jayq.core");
fb.buddies.show_buddy = function show_buddy(e, origa) {
  fb.pages.load_template.call(null, "indivbuddy");
  var pid__968798 = origa.data("pid");
  var bid__968799 = origa.data("bid");
  var ul__968800 = jayq.core.$.call(null, "#newpage div.indivbuddy div.list ul");
  var title__968801 = jayq.core.$.call(null, "#newpage div.indivbuddy h2 div.title");
  var li__968802 = jayq.core.$.call(null, "<li></li>");
  var a__968803 = jayq.core.$.call(null, "<a></a>");
  var validate__968805 = function() {
    var addb__968804 = jayq.core.$.call(null, "#content div.indivbuddy div.editname a");
    if(cljs.core.count.call(null, jayq.core.$.call(null, "#content div.indivbuddy div.editname input").val()) === 0) {
      return addb__968804.hide()
    }else {
      return addb__968804.show()
    }
  };
  var update_name__968808 = function(e) {
    var v__968806 = jayq.core.$.call(null, "#content div.indivbuddy div.editname input").val();
    var done__968807 = function(e) {
      return fb.sql.do_buddy.call(null, function(p1__968742_SHARP_, p2__968741_SHARP_) {
        jayq.core.$.call(null, "#content div.indivbuddy h2 div.title span.buddy").text(p2__968741_SHARP_.rows.item(0).bname);
        return jayq.core.$.call(null, "#content div.indivbuddy div.list li.addli a").trigger("click")
      }, bid__968799)
    };
    if(cljs.core.count.call(null, v__968806) === 0) {
      alert("Empty name")
    }else {
      fb.sql.up_buddy.call(null, bid__968799, v__968806, "img", done__968807)
    }
    return false
  };
  var edit_name__968812 = function(e) {
    var a__968809 = jayq.core.$.call(null, cljs.core.first.call(null, jayq.core.$.call(null, e.currentTarget)));
    var editdiv__968810 = jayq.core.$.call(null, "#content div.indivbuddy div.editname");
    var editbut__968811 = jayq.core.$.call(null, "#content div.indivbuddy div.list li.addli a");
    if(cljs.core.truth_(editdiv__968810.is(":visible"))) {
      a__968809.text("Edit Name");
      editdiv__968810.hide()
    }else {
      editdiv__968810.show();
      a__968809.text("Cancel Edit Name");
      jayq.core.$.call(null, "#content div.indivbuddy div.editname a").hide()
    }
    return false
  };
  var set_edit__968815 = function(bname) {
    var div__968813 = jayq.core.$.call(null, "#newpage div.indivbuddy div.editname").hide();
    var inp__968814 = jayq.core.$.call(null, "#newpage div.indivbuddy div.editname input").val(bname);
    jayq.core.$.call(null, "#newpage div.indivbuddy div.editname").hide();
    jayq.core.$.call(null, "#newpage div.indivbuddy div.editname li.addli a").bind("click touchend", update_name__968808);
    jayq.core.$.call(null, "#newpage div.indivbuddy div.editname form").submit(update_name__968808);
    inp__968814.keyup(validate__968805);
    return ul__968800.append(li__968802.clone().addClass("addli").append(a__968803.clone().text("Edit name").data("pid", pid__968798).data("bid", bid__968799).attr("href", "null").bind("click touchend", edit_name__968812)))
  };
  var set_budd_data__968850 = function(id, name, tot, tx) {
    return fb.sql.do_buddy.call(null, function(tx, r) {
      var i__968816 = r.rows.item(0);
      var nbc__968817 = r.rows.length;
      var costs__968825 = function() {
        var iter__2458__auto____968824 = function iter__968818(s__968819) {
          return new cljs.core.LazySeq(null, false, function() {
            var s__968819__968822 = s__968819;
            while(true) {
              if(cljs.core.seq.call(null, s__968819__968822)) {
                var c__968823 = cljs.core.first.call(null, s__968819__968822);
                return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([c__968823.cname, c__968823.ctot, c__968823.btot], true), iter__968818.call(null, cljs.core.rest.call(null, s__968819__968822)))
              }else {
                return null
              }
              break
            }
          }, null)
        };
        return iter__2458__auto____968824.call(null, fb.sql.row_seq.call(null, r))
      }();
      var tot__968826 = cljs.core.reduce.call(null, cljs.core._PLUS_, cljs.core.map.call(null, function(p1__968743_SHARP_) {
        return cljs.core.nth.call(null, p1__968743_SHARP_, 2)
      }, costs__968825));
      var maxpaid__968827 = cljs.core.apply.call(null, cljs.core.max, cljs.core.map.call(null, function(p1__968744_SHARP_) {
        return cljs.core.nth.call(null, p1__968744_SHARP_, 2)
      }, costs__968825));
      var bname__968828 = fb.vis.buddy.call(null, i__968816.bname);
      title__968801.append(bname__968828.clone()).append("'s total contribution: ").append(fb.vis.money.call(null, tot__968826));
      set_edit__968815.call(null, i__968816.bname);
      if(0 < tot__968826) {
        var G__968829__968830 = cljs.core.seq.call(null, costs__968825);
        if(G__968829__968830) {
          var G__968832__968834 = cljs.core.first.call(null, G__968829__968830);
          var vec__968833__968835 = G__968832__968834;
          var cname__968836 = cljs.core.nth.call(null, vec__968833__968835, 0, null);
          var ctot__968837 = cljs.core.nth.call(null, vec__968833__968835, 1, null);
          var btot__968838 = cljs.core.nth.call(null, vec__968833__968835, 2, null);
          var G__968829__968839 = G__968829__968830;
          var G__968832__968840 = G__968832__968834;
          var G__968829__968841 = G__968829__968839;
          while(true) {
            var vec__968842__968843 = G__968832__968840;
            var cname__968844 = cljs.core.nth.call(null, vec__968842__968843, 0, null);
            var ctot__968845 = cljs.core.nth.call(null, vec__968842__968843, 1, null);
            var btot__968846 = cljs.core.nth.call(null, vec__968842__968843, 2, null);
            var G__968829__968847 = G__968829__968841;
            ul__968800.append(fb.vis.set_rect_back.call(null, li__968802.clone().append(cname__968844).append(": ").append(bname__968828.clone()).append(" paid ").append(fb.vis.money.call(null, btot__968846)).append(" of ").append(fb.vis.money.call(null, ctot__968845)), maxpaid__968827, btot__968846));
            var temp__3974__auto____968848 = cljs.core.next.call(null, G__968829__968847);
            if(temp__3974__auto____968848) {
              var G__968829__968849 = temp__3974__auto____968848;
              var G__968851 = cljs.core.first.call(null, G__968829__968849);
              var G__968852 = G__968829__968849;
              G__968832__968840 = G__968851;
              G__968829__968841 = G__968852;
              continue
            }else {
            }
            break
          }
        }else {
        }
      }else {
      }
      ul__968800.append(li__968802.clone().addClass("rmli").append(a__968803.clone().text("Delete Buddy").data("pid", pid__968798).data("bid", bid__968799).data("rm", "buddy").data("anim", "pop").attr("href", "rm")));
      return fb.pages.swap_page.call(null, e, origa)
    }, bid__968799)
  };
  return fb.vis.set_title_project.call(null, set_budd_data__968850, pid__968798)
};
fb.buddies.append_buddy = function append_buddy(ul, li, pid, bid, name, ptot, btot) {
  return ul.append(fb.vis.set_rect_back.call(null, li.clone().append(jayq.core.$.call(null, "<a></a>").append(fb.vis.buddy.call(null, name)).append(": ").append(fb.vis.money.call(null, btot)).attr("href", "indivbuddy").data("bid", bid).data("pid", pid)), ptot, btot))
};
fb.buddies.add_page_buddy = function add_page_buddy() {
  var i__968861 = jayq.core.$.call(null, '#content div.buddies form [name="name"]');
  var name__968862 = i__968861.val();
  var pid__968863 = i__968861.data("pid");
  var addb__968867 = function(tx, r) {
    var ul__968864 = jayq.core.$.call(null, "#content div.buddies form div.list ul");
    var li__968865 = jayq.core.$.call(null, "<li></li>");
    var inp__968866 = jayq.core.$.call(null, '#content div.buddies form [name="name"]');
    inp__968866.val("");
    return fb.buddies.append_buddy.call(null, ul__968864, li__968865, pid__968863, r.insertId, fb.misc.trim.call(null, name__968862), 100, 0)
  };
  jayq.core.$.call(null, "#content div.buddies form ul li.addli a").hide();
  if(cljs.core.count.call(null, name__968862) <= 0) {
    alert("Invalid name")
  }else {
    fb.sql.add_buddy.call(null, pid__968863, name__968862, "img", addb__968867)
  }
  return false
};
fb.buddies.show_buddies = function show_buddies(e, origa) {
  fb.pages.load_template.call(null, "buddies");
  var pid__968877 = origa.data("pid");
  var inp__968878 = jayq.core.$.call(null, '#newpage div.buddies form [name="name"]');
  var ul__968879 = jayq.core.$.call(null, "#newpage div.buddies form div.list ul");
  var add__968880 = jayq.core.$.call(null, "#newpage div.buddies form ul li.addli a");
  var li__968881 = jayq.core.$.call(null, "<li></li>");
  var validate__968884 = function(e) {
    var inp__968882 = jayq.core.$.call(null, e.currentTarget);
    var addb__968883 = jayq.core.$.call(null, "#content div.buddies form ul li.addli a");
    if(cljs.core.count.call(null, inp__968882.val()) === 0) {
      return addb__968883.hide()
    }else {
      return addb__968883.show()
    }
  };
  var set_buddy_data__968885 = function(id, name, tot, tx) {
    inp__968878.keyup(validate__968884).data("pid", pid__968877);
    jayq.core.$.call(null, "#newpage div.buddies form").submit(fb.buddies.add_page_buddy);
    add__968880.hide().bind("touchend click", fb.buddies.add_page_buddy);
    fb.sql.do_buddies.call(null, function(tx, r) {
      return fb.sql.do_row.call(null, function(p1__968853_SHARP_) {
        return fb.buddies.append_buddy.call(null, ul__968879, li__968881, pid__968877, p1__968853_SHARP_.id, p1__968853_SHARP_.bname, p1__968853_SHARP_.ptot, p1__968853_SHARP_.btot)
      }, r)
    }, pid__968877);
    return fb.pages.swap_page.call(null, e, origa)
  };
  return fb.vis.set_title_project.call(null, set_buddy_data__968885, pid__968877)
};
fb.pages.add_page_init_BANG_.call(null, "indivbuddy", fb.buddies.show_buddy);
fb.pages.add_page_init_BANG_.call(null, "buddies", fb.buddies.show_buddies);
goog.provide("fb.total");
goog.require("cljs.core");
goog.require("jayq.util");
goog.require("fb.vis");
goog.require("fb.pages");
goog.require("jayq.core");
goog.require("fb.misc");
goog.require("fb.sql");
goog.require("fb.pages");
goog.require("fb.misc");
goog.require("fb.vis");
goog.require("fb.sql");
goog.require("jayq.util");
goog.require("jayq.core");
fb.total.show_total = function show_total(e, origa) {
  fb.pages.load_template.call(null, "total");
  var pid__968329 = origa.data("pid");
  var ul__968330 = jayq.core.$.call(null, "#newpage div.total div ul");
  var li__968331 = jayq.core.$.call(null, "<li></li>");
  var set_total_data__968433 = function(id, name, tot, tx) {
    fb.sql.do_buddies.call(null, function(tx, r) {
      var nbb__968332 = r.rows.length;
      var av__968333 = tot / nbb__968332;
      var abs__968334 = function(p1__968219_SHARP_) {
        if(0 < p1__968219_SHARP_) {
          return p1__968219_SHARP_
        }else {
          return-p1__968219_SHARP_
        }
      };
      var buds__968342 = function() {
        var iter__2458__auto____968341 = function iter__968335(s__968336) {
          return new cljs.core.LazySeq(null, false, function() {
            var s__968336__968339 = s__968336;
            while(true) {
              if(cljs.core.seq.call(null, s__968336__968339)) {
                var b__968340 = cljs.core.first.call(null, s__968336__968339);
                return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([abs__968334.call(null, av__968333 - b__968340.btot), b__968340.btot, b__968340.bname], true), iter__968335.call(null, cljs.core.rest.call(null, s__968336__968339)))
              }else {
                return null
              }
              break
            }
          }, null)
        };
        return iter__2458__auto____968341.call(null, fb.sql.row_seq.call(null, r))
      }();
      var divbuds__968343 = cljs.core.group_by.call(null, function(p1__968220_SHARP_) {
        return av__968333 > cljs.core.second.call(null, p1__968220_SHARP_)
      }, buds__968342);
      var maxpaid__968344 = cljs.core.apply.call(null, cljs.core.max, cljs.core.map.call(null, function(p1__968221_SHARP_) {
        return cljs.core.second.call(null, p1__968221_SHARP_)
      }, buds__968342));
      var cmp__968345 = function(p1__968222_SHARP_, p2__968223_SHARP_) {
        return p1__968222_SHARP_.btot < p2__968223_SHARP_.btot
      };
      var bgive__968346 = cljs.core.sort.call(null, cmp__968345, divbuds__968343.call(null, true));
      var btake__968347 = cljs.core.sort.call(null, cmp__968345, divbuds__968343.call(null, false));
      var owes__968390 = function() {
        var G__968350__968354 = cljs.core.first.call(null, btake__968347);
        var vec__968352__968355 = G__968350__968354;
        var tdif__968356 = cljs.core.nth.call(null, vec__968352__968355, 0, null);
        var ttot__968357 = cljs.core.nth.call(null, vec__968352__968355, 1, null);
        var tname__968358 = cljs.core.nth.call(null, vec__968352__968355, 2, null);
        var t__968359 = vec__968352__968355;
        var ts__968360 = cljs.core.next.call(null, btake__968347);
        var G__968351__968361 = cljs.core.first.call(null, bgive__968346);
        var vec__968353__968362 = G__968351__968361;
        var gdif__968363 = cljs.core.nth.call(null, vec__968353__968362, 0, null);
        var gtot__968364 = cljs.core.nth.call(null, vec__968353__968362, 1, null);
        var gname__968365 = cljs.core.nth.call(null, vec__968353__968362, 2, null);
        var g__968366 = vec__968353__968362;
        var gs__968367 = cljs.core.next.call(null, bgive__968346);
        var ac__968368 = cljs.core.PersistentVector.EMPTY;
        var G__968350__968369 = G__968350__968354;
        var ts__968370 = ts__968360;
        var G__968351__968371 = G__968351__968361;
        var gs__968372 = gs__968367;
        var ac__968373 = ac__968368;
        while(true) {
          var vec__968374__968376 = G__968350__968369;
          var tdif__968377 = cljs.core.nth.call(null, vec__968374__968376, 0, null);
          var ttot__968378 = cljs.core.nth.call(null, vec__968374__968376, 1, null);
          var tname__968379 = cljs.core.nth.call(null, vec__968374__968376, 2, null);
          var t__968380 = vec__968374__968376;
          var ts__968381 = ts__968370;
          var vec__968375__968382 = G__968351__968371;
          var gdif__968383 = cljs.core.nth.call(null, vec__968375__968382, 0, null);
          var gtot__968384 = cljs.core.nth.call(null, vec__968375__968382, 1, null);
          var gname__968385 = cljs.core.nth.call(null, vec__968375__968382, 2, null);
          var g__968386 = vec__968375__968382;
          var gs__968387 = gs__968372;
          var ac__968388 = ac__968373;
          if(cljs.core.truth_(function() {
            var and__3822__auto____968389 = g__968386;
            if(cljs.core.truth_(and__3822__auto____968389)) {
              return t__968380
            }else {
              return and__3822__auto____968389
            }
          }())) {
            if(tdif__968377 > gdif__968383) {
              var G__968434 = cljs.core.PersistentVector.fromArray([tdif__968377 - gdif__968383, ttot__968378, tname__968379], true);
              var G__968435 = ts__968381;
              var G__968436 = cljs.core.first.call(null, gs__968387);
              var G__968437 = cljs.core.next.call(null, gs__968387);
              var G__968438 = cljs.core.conj.call(null, ac__968388, cljs.core.PersistentVector.fromArray([gname__968385, tname__968379, gdif__968383], true));
              G__968350__968369 = G__968434;
              ts__968370 = G__968435;
              G__968351__968371 = G__968436;
              gs__968372 = G__968437;
              ac__968373 = G__968438;
              continue
            }else {
              var G__968439 = cljs.core.first.call(null, ts__968381);
              var G__968440 = cljs.core.next.call(null, ts__968381);
              var G__968441 = cljs.core.PersistentVector.fromArray([gdif__968383 - tdif__968377, gtot__968384, gname__968385], true);
              var G__968442 = gs__968387;
              var G__968443 = cljs.core.conj.call(null, ac__968388, cljs.core.PersistentVector.fromArray([gname__968385, tname__968379, tdif__968377], true));
              G__968350__968369 = G__968439;
              ts__968370 = G__968440;
              G__968351__968371 = G__968441;
              gs__968372 = G__968442;
              ac__968373 = G__968443;
              continue
            }
          }else {
            return ac__968388
          }
          break
        }
      }();
      var G__968391__968392 = cljs.core.seq.call(null, buds__968342);
      if(G__968391__968392) {
        var G__968394__968396 = cljs.core.first.call(null, G__968391__968392);
        var vec__968395__968397 = G__968394__968396;
        var d__968398 = cljs.core.nth.call(null, vec__968395__968397, 0, null);
        var t__968399 = cljs.core.nth.call(null, vec__968395__968397, 1, null);
        var n__968400 = cljs.core.nth.call(null, vec__968395__968397, 2, null);
        var G__968391__968401 = G__968391__968392;
        var G__968394__968402 = G__968394__968396;
        var G__968391__968403 = G__968391__968401;
        while(true) {
          var vec__968404__968405 = G__968394__968402;
          var d__968406 = cljs.core.nth.call(null, vec__968404__968405, 0, null);
          var t__968407 = cljs.core.nth.call(null, vec__968404__968405, 1, null);
          var n__968408 = cljs.core.nth.call(null, vec__968404__968405, 2, null);
          var G__968391__968409 = G__968391__968403;
          ul__968330.append(fb.vis.set_tot_rect_back.call(null, li__968331.clone().append(fb.vis.buddy.call(null, n__968408)).append(" paid: ").append(fb.vis.money.call(null, t__968407)).append(t__968407 > av__968333 ? ": needs " : ": owes ").append(fb.vis.money.call(null, d__968406)), maxpaid__968344, av__968333, t__968407));
          var temp__3974__auto____968410 = cljs.core.next.call(null, G__968391__968409);
          if(temp__3974__auto____968410) {
            var G__968391__968411 = temp__3974__auto____968410;
            var G__968444 = cljs.core.first.call(null, G__968391__968411);
            var G__968445 = G__968391__968411;
            G__968394__968402 = G__968444;
            G__968391__968403 = G__968445;
            continue
          }else {
          }
          break
        }
      }else {
      }
      var G__968412__968413 = cljs.core.seq.call(null, owes__968390);
      if(G__968412__968413) {
        var G__968415__968417 = cljs.core.first.call(null, G__968412__968413);
        var vec__968416__968418 = G__968415__968417;
        var gn__968419 = cljs.core.nth.call(null, vec__968416__968418, 0, null);
        var tn__968420 = cljs.core.nth.call(null, vec__968416__968418, 1, null);
        var tot__968421 = cljs.core.nth.call(null, vec__968416__968418, 2, null);
        var G__968412__968422 = G__968412__968413;
        var G__968415__968423 = G__968415__968417;
        var G__968412__968424 = G__968412__968422;
        while(true) {
          var vec__968425__968426 = G__968415__968423;
          var gn__968427 = cljs.core.nth.call(null, vec__968425__968426, 0, null);
          var tn__968428 = cljs.core.nth.call(null, vec__968425__968426, 1, null);
          var tot__968429 = cljs.core.nth.call(null, vec__968425__968426, 2, null);
          var G__968412__968430 = G__968412__968424;
          ul__968330.append(li__968331.clone().append(fb.vis.buddy.call(null, gn__968427)).append(" owes ").append(fb.vis.money.call(null, tot__968429)).append(" to ").append(fb.vis.buddy.call(null, tn__968428)));
          var temp__3974__auto____968431 = cljs.core.next.call(null, G__968412__968430);
          if(temp__3974__auto____968431) {
            var G__968412__968432 = temp__3974__auto____968431;
            var G__968446 = cljs.core.first.call(null, G__968412__968432);
            var G__968447 = G__968412__968432;
            G__968415__968423 = G__968446;
            G__968412__968424 = G__968447;
            continue
          }else {
            return null
          }
          break
        }
      }else {
        return null
      }
    }, pid__968329);
    return fb.pages.swap_page.call(null, e, origa)
  };
  return fb.vis.set_title_project.call(null, set_total_data__968433, pid__968329)
};
fb.pages.add_page_init_BANG_.call(null, "total", fb.total.show_total);
goog.provide("fb.settings");
goog.require("cljs.core");
goog.require("jayq.util");
goog.require("fb.vis");
goog.require("fb.pages");
goog.require("jayq.core");
goog.require("fb.misc");
goog.require("fb.sql");
goog.require("fb.pages");
goog.require("fb.misc");
goog.require("fb.vis");
goog.require("fb.sql");
goog.require("jayq.util");
goog.require("jayq.core");
fb.settings.show_settings = function show_settings(e, origa) {
  fb.pages.load_template.call(null, "settings");
  var pid__1067904 = origa.data("pid");
  var menu__1067905 = jayq.core.$.call(null, "#newpage div.settings .toolbar");
  var ulPos__1067906 = jayq.core.$.call(null, "#newpage div.settings ul.menuPos");
  var ulHelp__1067907 = jayq.core.$.call(null, "#newpage div.settings ul.help");
  var liApply__1067908 = jayq.core.$.call(null, "#newpage div.settings ul.apply li");
  var li__1067909 = jayq.core.$.call(null, "<li></li>");
  var a__1067910 = jayq.core.$.call(null, "<a></a>");
  var inp__1067911 = jayq.core.$.call(null, "<input />");
  var add_inp__1067912 = function(li, type, title, grp, check_QMARK_, data) {
    return li.clone().append(fb.misc.add_data.call(null, inp__1067911.clone(), "inp", data).attr("checked", check_QMARK_).attr("title", title).attr("value", title).attr("type", type).attr("name", grp)).append()
  };
  var update__1067920 = function(e) {
    fb.sql.do_settings.call(null, function(settings) {
      var menuPos__1067918 = function() {
        var pred__1067913__1067916 = cljs.core._EQ_;
        var expr__1067914__1067917 = jayq.core.$.call(null, '#content input[name="menuPos"]:checked').val();
        if(pred__1067913__1067916.call(null, "Top", expr__1067914__1067917)) {
          return"\ufdd0'top"
        }else {
          if(pred__1067913__1067916.call(null, "Bottom", expr__1067914__1067917)) {
            return"\ufdd0'bottom"
          }else {
            throw new Error([cljs.core.str("No matching clause: "), cljs.core.str(expr__1067914__1067917)].join(""));
          }
        }
      }();
      var help__1067919 = jayq.core.$.call(null, '#content input[name="help"]').attr("checked");
      return fb.sql.update_settings.call(null, cljs.core.ObjMap.fromObject(["\ufdd0'menuOn", "\ufdd0'menuPos", "\ufdd0'help"], {"\ufdd0'menuOn":(new cljs.core.Keyword("\ufdd0'menuOn")).call(null, settings), "\ufdd0'menuPos":menuPos__1067918, "\ufdd0'help":help__1067919}), function() {
        fb.pages.trigger_new_page.call(null, "back", null);
        return false
      })
    });
    return false
  };
  var set_settings__1067921 = function(settings) {
    ulPos__1067906.append(li__1067909.clone().text("Menu Placement:")).append(add_inp__1067912.call(null, li__1067909, "radio", "Top", "menuPos", cljs.core._EQ_.call(null, "\ufdd0'top", (new cljs.core.Keyword("\ufdd0'menuPos")).call(null, settings)), cljs.core.ObjMap.fromObject(["inp"], {"inp":cljs.core.PersistentVector.fromArray([cljs.core.PersistentVector.fromArray(["type", "top"], true)], true)}))).append(add_inp__1067912.call(null, li__1067909, "radio", "Bottom", "menuPos", cljs.core._EQ_.call(null, 
    "\ufdd0'bottom", (new cljs.core.Keyword("\ufdd0'menuPos")).call(null, settings)), cljs.core.ObjMap.fromObject(["inp"], {"inp":cljs.core.PersistentVector.fromArray([cljs.core.PersistentVector.fromArray(["type", "bottom"], true)], true)})));
    ulHelp__1067907.append(add_inp__1067912.call(null, li__1067909, "checkbox", "Display Help", "help", (new cljs.core.Keyword("\ufdd0'help")).call(null, settings), cljs.core.ObjMap.fromObject(["inp"], {"inp":cljs.core.PersistentVector.fromArray([cljs.core.PersistentVector.fromArray(["type", "help"], true)], true)})));
    liApply__1067908.addClass("addli").append(a__1067910.clone().attr("href", "back").text("Apply").bind("click touchend", update__1067920));
    jayq.core.$.call(null, "#newpage div.settings form").submit(update__1067920);
    return fb.pages.swap_page.call(null, e, origa)
  };
  menu__1067905.append(a__1067910.clone().addClass("back").attr("href", "back").text("Back"));
  return fb.sql.do_settings.call(null, set_settings__1067921)
};
fb.pages.add_page_init_BANG_.call(null, "settings", fb.settings.show_settings);
goog.provide("fb.lol");
goog.require("cljs.core");
goog.require("jayq.util");
goog.require("fb.vis");
goog.require("fb.pages");
goog.require("jayq.core");
goog.require("fb.misc");
goog.require("fb.sql");
goog.require("fb.init");
goog.require("fb.init");
goog.require("fb.pages");
goog.require("fb.misc");
goog.require("fb.vis");
goog.require("fb.sql");
goog.require("jayq.util");
goog.require("jayq.core");
fb.init.add_init_BANG_.call(null, function() {
  return fb.pages.trigger_new_page.call(null, "projects", null)
}, "\ufdd0'last");
fb.init.do_inits.call(null);
goog.provide("fb.cost");
goog.require("cljs.core");
goog.require("jayq.util");
goog.require("fb.vis");
goog.require("fb.pages");
goog.require("jayq.core");
goog.require("fb.misc");
goog.require("fb.sql");
goog.require("fb.pages");
goog.require("fb.misc");
goog.require("fb.vis");
goog.require("fb.sql");
goog.require("jayq.util");
goog.require("jayq.core");
fb.cost.show_cost = function show_cost(e, origa) {
  fb.pages.load_template.call(null, "cost");
  var pid__969116 = origa.data("pid");
  var cid__969117 = origa.data("cid");
  var ul__969118 = jayq.core.$.call(null, "#newpage div.cost div ul");
  var ti__969119 = jayq.core.$.call(null, "#newpage div.cost div.title");
  var li__969120 = jayq.core.$.call(null, "<li></li>");
  var a__969121 = jayq.core.$.call(null, "<a></a>");
  var set_cost_data__969153 = function(id, name, tot, tx) {
    fb.sql.do_cost.call(null, function(tx, r) {
      var i__969122 = r.rows.item(0);
      var buds__969130 = function() {
        var iter__2458__auto____969129 = function iter__969123(s__969124) {
          return new cljs.core.LazySeq(null, false, function() {
            var s__969124__969127 = s__969124;
            while(true) {
              if(cljs.core.seq.call(null, s__969124__969127)) {
                var b__969128 = cljs.core.first.call(null, s__969124__969127);
                return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([b__969128.bname, b__969128.btot, b__969128.ctot], true), iter__969123.call(null, cljs.core.rest.call(null, s__969124__969127)))
              }else {
                return null
              }
              break
            }
          }, null)
        };
        return iter__2458__auto____969129.call(null, fb.sql.row_seq.call(null, r))
      }();
      var maxpaid__969131 = cljs.core.apply.call(null, cljs.core.max, cljs.core.map.call(null, function(p1__969077_SHARP_) {
        return cljs.core.nth.call(null, p1__969077_SHARP_, 1)
      }, buds__969130));
      ti__969119.append([cljs.core.str(i__969122.cname), cljs.core.str(": ")].join("")).append(fb.vis.money.call(null, i__969122.ctot));
      ul__969118.append(li__969120.clone().addClass("addli").append(a__969121.clone().text("Edit").data("pid", pid__969116).data("cid", cid__969117).attr("href", "newcost")));
      var G__969132__969133 = cljs.core.seq.call(null, buds__969130);
      if(G__969132__969133) {
        var G__969135__969137 = cljs.core.first.call(null, G__969132__969133);
        var vec__969136__969138 = G__969135__969137;
        var name__969139 = cljs.core.nth.call(null, vec__969136__969138, 0, null);
        var btot__969140 = cljs.core.nth.call(null, vec__969136__969138, 1, null);
        var ctot__969141 = cljs.core.nth.call(null, vec__969136__969138, 2, null);
        var G__969132__969142 = G__969132__969133;
        var G__969135__969143 = G__969135__969137;
        var G__969132__969144 = G__969132__969142;
        while(true) {
          var vec__969145__969146 = G__969135__969143;
          var name__969147 = cljs.core.nth.call(null, vec__969145__969146, 0, null);
          var btot__969148 = cljs.core.nth.call(null, vec__969145__969146, 1, null);
          var ctot__969149 = cljs.core.nth.call(null, vec__969145__969146, 2, null);
          var G__969132__969150 = G__969132__969144;
          ul__969118.append(fb.vis.set_rect_back.call(null, li__969120.clone(), maxpaid__969131, btot__969148).append(a__969121.clone().append(fb.vis.buddy.call(null, name__969147)).append(": ").append(fb.vis.money.call(null, btot__969148)).data("cid", cid__969117).data("pid", pid__969116)));
          var temp__3974__auto____969151 = cljs.core.next.call(null, G__969132__969150);
          if(temp__3974__auto____969151) {
            var G__969132__969152 = temp__3974__auto____969151;
            var G__969154 = cljs.core.first.call(null, G__969132__969152);
            var G__969155 = G__969132__969152;
            G__969135__969143 = G__969154;
            G__969132__969144 = G__969155;
            continue
          }else {
          }
          break
        }
      }else {
      }
      return ul__969118.append(li__969120.clone().addClass("rmli").append(a__969121.clone().text("Delete Expense").data("pid", pid__969116).data("cid", cid__969117).data("rm", "cost").data("anim", "pop").attr("href", "rm")))
    }, cid__969117);
    return fb.pages.swap_page.call(null, e, origa)
  };
  return fb.vis.set_title_project.call(null, set_cost_data__969153, pid__969116)
};
fb.cost.add_page_cost = function add_page_cost() {
  var i__969219 = jayq.core.$.call(null, '#content div.newcost form [name="name"]');
  var name__969220 = i__969219.val();
  var pid__969221 = i__969219.data("pid");
  var cid__969222 = i__969219.data("cid");
  var alli__969223 = jayq.core.$.call(null, '#content div.newcost form div.buddieslist [name="tot"]');
  var total__969231 = cljs.core.reduce.call(null, cljs.core._PLUS_, function() {
    var iter__2458__auto____969230 = function iter__969224(s__969225) {
      return new cljs.core.LazySeq(null, false, function() {
        var s__969225__969228 = s__969225;
        while(true) {
          if(cljs.core.seq.call(null, s__969225__969228)) {
            var i__969229 = cljs.core.first.call(null, s__969225__969228);
            return cljs.core.cons.call(null, fb.misc.num.call(null, jayq.core.$.call(null, i__969229).val()), iter__969224.call(null, cljs.core.rest.call(null, s__969225__969228)))
          }else {
            return null
          }
          break
        }
      }, null)
    };
    return iter__2458__auto____969230.call(null, alli__969223)
  }());
  var done__969232 = function() {
    return fb.pages.trigger_new_page.call(null, "proj", cljs.core.ObjMap.fromObject(["proj"], {"proj":cljs.core.PersistentVector.fromArray([cljs.core.PersistentVector.fromArray(["pid", pid__969221], true)], true)}))
  };
  if(cljs.core.count.call(null, name__969220) <= 0) {
    alert("Invalid name")
  }else {
    if(total__969231 <= 0) {
      alert("No money")
    }else {
      if(cljs.core.truth_(cid__969222)) {
        fb.sql.up_cost.call(null, cid__969222, name__969220, function() {
          var iter__2458__auto____969245 = function iter__969233(s__969234) {
            return new cljs.core.LazySeq(null, false, function() {
              var s__969234__969240 = s__969234;
              while(true) {
                if(cljs.core.seq.call(null, s__969234__969240)) {
                  var i__969241 = cljs.core.first.call(null, s__969234__969240);
                  var e__969242 = jayq.core.$.call(null, i__969241);
                  var rid__969243 = e__969242.data("rid");
                  if(function() {
                    var and__3822__auto____969244 = rid__969243 === 0;
                    if(and__3822__auto____969244) {
                      return e__969242.val() > 0
                    }else {
                      return and__3822__auto____969244
                    }
                  }()) {
                    return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([e__969242.data("bid"), fb.misc.num.call(null, e__969242.val())], true), iter__969233.call(null, cljs.core.rest.call(null, s__969234__969240)))
                  }else {
                    var G__969281 = cljs.core.rest.call(null, s__969234__969240);
                    s__969234__969240 = G__969281;
                    continue
                  }
                }else {
                  return null
                }
                break
              }
            }, null)
          };
          return iter__2458__auto____969245.call(null, alli__969223)
        }(), function() {
          var iter__2458__auto____969258 = function iter__969246(s__969247) {
            return new cljs.core.LazySeq(null, false, function() {
              var s__969247__969253 = s__969247;
              while(true) {
                if(cljs.core.seq.call(null, s__969247__969253)) {
                  var i__969254 = cljs.core.first.call(null, s__969247__969253);
                  var e__969255 = jayq.core.$.call(null, i__969254);
                  var rid__969256 = e__969255.data("rid");
                  if(function() {
                    var and__3822__auto____969257 = rid__969256 > 0;
                    if(and__3822__auto____969257) {
                      return e__969255.val() > 0
                    }else {
                      return and__3822__auto____969257
                    }
                  }()) {
                    return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([e__969255.data("rid"), fb.misc.num.call(null, e__969255.val())], true), iter__969246.call(null, cljs.core.rest.call(null, s__969247__969253)))
                  }else {
                    var G__969282 = cljs.core.rest.call(null, s__969247__969253);
                    s__969247__969253 = G__969282;
                    continue
                  }
                }else {
                  return null
                }
                break
              }
            }, null)
          };
          return iter__2458__auto____969258.call(null, alli__969223)
        }(), function() {
          var iter__2458__auto____969271 = function iter__969259(s__969260) {
            return new cljs.core.LazySeq(null, false, function() {
              var s__969260__969266 = s__969260;
              while(true) {
                if(cljs.core.seq.call(null, s__969260__969266)) {
                  var i__969267 = cljs.core.first.call(null, s__969260__969266);
                  var e__969268 = jayq.core.$.call(null, i__969267);
                  var rid__969269 = e__969268.data("rid");
                  if(function() {
                    var and__3822__auto____969270 = rid__969269 > 0;
                    if(and__3822__auto____969270) {
                      return fb.misc.num.call(null, e__969268.val()) === 0
                    }else {
                      return and__3822__auto____969270
                    }
                  }()) {
                    return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([e__969268.data("bid"), e__969268.data("rid")], true), iter__969259.call(null, cljs.core.rest.call(null, s__969260__969266)))
                  }else {
                    var G__969283 = cljs.core.rest.call(null, s__969260__969266);
                    s__969260__969266 = G__969283;
                    continue
                  }
                }else {
                  return null
                }
                break
              }
            }, null)
          };
          return iter__2458__auto____969271.call(null, alli__969223)
        }(), pid__969221, total__969231, done__969232)
      }else {
        fb.sql.add_cost.call(null, name__969220, function() {
          var iter__2458__auto____969280 = function iter__969272(s__969273) {
            return new cljs.core.LazySeq(null, false, function() {
              var s__969273__969277 = s__969273;
              while(true) {
                if(cljs.core.seq.call(null, s__969273__969277)) {
                  var i__969278 = cljs.core.first.call(null, s__969273__969277);
                  var e__969279 = jayq.core.$.call(null, i__969278);
                  if(e__969279.val() > 0) {
                    return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([fb.misc.num.call(null, e__969279.data("bid")), fb.misc.num.call(null, e__969279.val())], true), iter__969272.call(null, cljs.core.rest.call(null, s__969273__969277)))
                  }else {
                    var G__969284 = cljs.core.rest.call(null, s__969273__969277);
                    s__969273__969277 = G__969284;
                    continue
                  }
                }else {
                  return null
                }
                break
              }
            }, null)
          };
          return iter__2458__auto____969280.call(null, alli__969223)
        }(), pid__969221, total__969231, done__969232)
      }
    }
  }
  return false
};
fb.cost.show_new_cost = function show_new_cost(e, origa) {
  fb.pages.load_template.call(null, "newcost");
  var pid__969347 = origa.data("pid");
  var cid__969348 = origa.data("cid");
  var inp__969349 = jayq.core.$.call(null, '#newpage div.newcost form [name="name"]');
  var ul__969350 = jayq.core.$.call(null, "#newpage div.newcost form div.buddieslist ul");
  var label__969351 = jayq.core.$.call(null, "<label></label>");
  var li__969352 = jayq.core.$.call(null, "<li></li>");
  var binput__969353 = jayq.core.$.call(null, '<input type="number" step="any" min="0" class="numbers" name="tot" />');
  var validate__969369 = function(e) {
    var inp__969354 = jayq.core.$.call(null, e.currentTarget);
    var v__969355 = inp__969354.val();
    var total__969356 = jayq.core.$.call(null, "#content div.newcost .costtotal");
    var alli__969357 = jayq.core.$.call(null, '#content div.newcost form div.buddieslist [name="tot"]');
    var name__969358 = jayq.core.$.call(null, '#content div.newcost form [name="name"]').val();
    var addb__969359 = jayq.core.$.call(null, "#content div.newcost form div.buddieslist ul li.addli a");
    var tot__969367 = cljs.core.reduce.call(null, cljs.core._PLUS_, 0, function() {
      var iter__2458__auto____969366 = function iter__969360(s__969361) {
        return new cljs.core.LazySeq(null, false, function() {
          var s__969361__969364 = s__969361;
          while(true) {
            if(cljs.core.seq.call(null, s__969361__969364)) {
              var i__969365 = cljs.core.first.call(null, s__969361__969364);
              return cljs.core.cons.call(null, fb.misc.num.call(null, jayq.core.$.call(null, i__969365).val()), iter__969360.call(null, cljs.core.rest.call(null, s__969361__969364)))
            }else {
              return null
            }
            break
          }
        }, null)
      };
      return iter__2458__auto____969366.call(null, alli__969357)
    }());
    total__969356.html(fb.vis.money.call(null, tot__969367));
    if(function() {
      var or__3824__auto____969368 = tot__969367 <= 0;
      if(or__3824__auto____969368) {
        return or__3824__auto____969368
      }else {
        return cljs.core.count.call(null, name__969358) <= 0
      }
    }()) {
      return addb__969359.hide()
    }else {
      return addb__969359.show()
    }
  };
  var set_buddy_data__969408 = function(id, name, tot, tx) {
    inp__969349.keyup(validate__969369).data("cid", cid__969348).data("pid", pid__969347);
    fb.sql.do_buddies.call(null, function(tx, r) {
      if(r.rows.length > 0) {
        var buds__969384 = cljs.core.truth_(cid__969348) ? function() {
          var iter__2458__auto____969376 = function iter__969370(s__969371) {
            return new cljs.core.LazySeq(null, false, function() {
              var s__969371__969374 = s__969371;
              while(true) {
                if(cljs.core.seq.call(null, s__969371__969374)) {
                  var b__969375 = cljs.core.first.call(null, s__969371__969374);
                  return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([b__969375.bname, b__969375.id, b__969375.btot, b__969375.rid], true), iter__969370.call(null, cljs.core.rest.call(null, s__969371__969374)))
                }else {
                  return null
                }
                break
              }
            }, null)
          };
          return iter__2458__auto____969376.call(null, fb.sql.row_seq.call(null, r))
        }() : function() {
          var iter__2458__auto____969383 = function iter__969377(s__969378) {
            return new cljs.core.LazySeq(null, false, function() {
              var s__969378__969381 = s__969378;
              while(true) {
                if(cljs.core.seq.call(null, s__969378__969381)) {
                  var b__969382 = cljs.core.first.call(null, s__969378__969381);
                  return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([b__969382.bname, b__969382.id, 0, null], true), iter__969377.call(null, cljs.core.rest.call(null, s__969378__969381)))
                }else {
                  return null
                }
                break
              }
            }, null)
          };
          return iter__2458__auto____969383.call(null, fb.sql.row_seq.call(null, r))
        }();
        var G__969385__969386 = cljs.core.seq.call(null, buds__969384);
        if(G__969385__969386) {
          var G__969388__969390 = cljs.core.first.call(null, G__969385__969386);
          var vec__969389__969391 = G__969388__969390;
          var bname__969392 = cljs.core.nth.call(null, vec__969389__969391, 0, null);
          var bid__969393 = cljs.core.nth.call(null, vec__969389__969391, 1, null);
          var btot__969394 = cljs.core.nth.call(null, vec__969389__969391, 2, null);
          var rid__969395 = cljs.core.nth.call(null, vec__969389__969391, 3, null);
          var G__969385__969396 = G__969385__969386;
          var G__969388__969397 = G__969388__969390;
          var G__969385__969398 = G__969385__969396;
          while(true) {
            var vec__969399__969400 = G__969388__969397;
            var bname__969401 = cljs.core.nth.call(null, vec__969399__969400, 0, null);
            var bid__969402 = cljs.core.nth.call(null, vec__969399__969400, 1, null);
            var btot__969403 = cljs.core.nth.call(null, vec__969399__969400, 2, null);
            var rid__969404 = cljs.core.nth.call(null, vec__969399__969400, 3, null);
            var G__969385__969405 = G__969385__969398;
            ul__969350.append(li__969352.clone().append(label__969351.clone().append(fb.vis.buddy.call(null, bname__969401)).append(":")).append(function(G__969388__969397, G__969385__969398, vec__969399__969400, bname__969401, bid__969402, btot__969403, rid__969404, G__969385__969405) {
              return function(p1__969156_SHARP_) {
                if(btot__969403 === 0) {
                  return p1__969156_SHARP_
                }else {
                  return p1__969156_SHARP_.val(btot__969403)
                }
              }
            }(G__969388__969397, G__969385__969398, vec__969399__969400, bname__969401, bid__969402, btot__969403, rid__969404, G__969385__969405).call(null, binput__969353.clone().data("pid", pid__969347).data("bid", bid__969402).data("rid", rid__969404).attr("placeholder", [cljs.core.str(bname__969401), cljs.core.str(" paid...")].join(""))).keyup(validate__969369)).bind("focus click touchend", function(G__969388__969397, G__969385__969398, vec__969399__969400, bname__969401, bid__969402, btot__969403, 
            rid__969404, G__969385__969405) {
              return function(e) {
                return jayq.core.$.call(null, e.currentTarget).children("input").trigger("focus")
              }
            }(G__969388__969397, G__969385__969398, vec__969399__969400, bname__969401, bid__969402, btot__969403, rid__969404, G__969385__969405)));
            var temp__3974__auto____969406 = cljs.core.next.call(null, G__969385__969405);
            if(temp__3974__auto____969406) {
              var G__969385__969407 = temp__3974__auto____969406;
              var G__969409 = cljs.core.first.call(null, G__969385__969407);
              var G__969410 = G__969385__969407;
              G__969388__969397 = G__969409;
              G__969385__969398 = G__969410;
              continue
            }else {
            }
            break
          }
        }else {
        }
        if(cljs.core.truth_(cid__969348)) {
          inp__969349.val(r.rows.item(0).cname)
        }else {
        }
        return ul__969350.append(li__969352.clone().addClass("addli").append(jayq.core.$.call(null, "<a></a>").hide().text("Add").attr("href", "null").bind("click touchend", fb.cost.add_page_cost)))
      }else {
        return ul__969350.append(li__969352.clone().append(jayq.core.$.call(null, "<a></a>").attr("href", "buddies").data("pid", pid__969347).text("Add buddies first!")))
      }
    }, pid__969347, cid__969348);
    jayq.core.$.call(null, "#newpage div.newcost form").submit(fb.cost.add_page_cost);
    jayq.core.$.call(null, "#newpage").bind("pageAnimationEnd", function() {
      return inp__969349.trigger("keyup")
    });
    return fb.pages.swap_page.call(null, e, origa)
  };
  return fb.vis.set_title_project.call(null, set_buddy_data__969408, pid__969347)
};
fb.pages.add_page_init_BANG_.call(null, "cost", fb.cost.show_cost);
fb.pages.add_page_init_BANG_.call(null, "newcost", fb.cost.show_new_cost);
