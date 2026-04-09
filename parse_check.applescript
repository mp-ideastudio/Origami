on run argv
    set filePath to item 1 of argv
    set scriptContents to do shell script "sed -n '/<script>/,/<\\/script>/p' " & quoted form of filePath & " | sed '1d;$d'"
    
    try
        -- Use JavaScriptCore via OSA to compile the script securely
        do shell script "osascript -l JavaScript -e " & quoted form of scriptContents
        return "Compilation OK"
    on error errMsg
        return errMsg
    end try
end run
