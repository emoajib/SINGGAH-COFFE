package entity

type Setting struct {
	ID           uint
	Key          string
	Value        string
	SettingGroup string
}

type SettingMap map[string]string
