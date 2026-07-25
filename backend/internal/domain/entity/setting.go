package entity

type Setting struct {
	ID           uint   `json:"id"`
	Key          string `json:"key"`
	Value        string `json:"value"`
	SettingGroup string `json:"group"`
}

type SettingMap map[string]string
